const { randomUUID } = require("crypto");
const { redisClient } = require("../../../config/redis");

const RULE_VERSION = "risk-v1";

function readPositiveNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const limits = {
  maxQuantity: readPositiveNumber("RISK_MAX_ORDER_QUANTITY", 100000),
  maxOrderValue: readPositiveNumber("RISK_MAX_ORDER_VALUE", 5000000),
  maxPositionQuantity: readPositiveNumber("RISK_MAX_POSITION_QUANTITY", 250000),
  priceBandPercent: readPositiveNumber("RISK_PRICE_BAND_PERCENT", 25),
  ordersPerMinute: readPositiveNumber("RISK_ORDERS_PER_MINUTE", 60),
  dailyLossLimit: readPositiveNumber("RISK_DAILY_LOSS_LIMIT", 5000),
};
const cacheMetrics = { hits: 0, misses: 0 };

async function consumeRateLimit(userId) {
  const key = `risk:rate:${userId}:${Math.floor(Date.now() / 60000)}`;
  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.expire(key, 60);
  }
  return Number(count) <= limits.ordersPerMinute;
}

async function appendAuditEvent(db, event) {
  await db.query(
    `INSERT INTO audit_events (
      correlation_id, entity_type, entity_id, user_id, event_type, payload
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      event.correlationId,
      event.entityType,
      event.entityId || null,
      event.userId || null,
      event.eventType,
      JSON.stringify(event.payload || {}),
    ]
  );
}

async function consumeReservation(db, correlationId, orderId) {
  await db.query(
    `UPDATE risk_reservations
     SET status = 'CONSUMED', order_id = $2, released_at = CURRENT_TIMESTAMP
     WHERE correlation_id = $1 AND status = 'ACTIVE'`,
    [correlationId, orderId]
  );
}

async function appendOrderAuditEvent(db, event) {
  const correlation = await db.query(
    `SELECT correlation_id
     FROM risk_reservations
     WHERE order_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [event.orderId]
  );
  if (!correlation.rows[0]) return;

  await appendAuditEvent(db, {
    correlationId: correlation.rows[0].correlation_id,
    entityType: event.entityType || "ORDER",
    entityId: event.orderId,
    userId: event.userId,
    eventType: event.eventType,
    payload: event.payload,
  });
}

async function recordRealizedPnl(db, { userId, quantity, entryPrice, exitPrice, orderId }) {
  const realizedPnl = Number(((Number(exitPrice) - Number(entryPrice)) * Number(quantity)).toFixed(2));
  await db.query(
    `INSERT INTO risk_daily_pnl (user_id, trading_date, realized_pnl)
     VALUES ($1, CURRENT_DATE, $2)
     ON CONFLICT (user_id, trading_date)
     DO UPDATE SET realized_pnl = risk_daily_pnl.realized_pnl + EXCLUDED.realized_pnl,
                   updated_at = CURRENT_TIMESTAMP`,
    [userId, realizedPnl]
  );
  await appendOrderAuditEvent(db, {
    orderId,
    userId,
    entityType: "ORDER",
    eventType: "DAILY_PNL_UPDATED",
    payload: { realizedPnl },
  });
}

async function persistDecision(db, input) {
  await db.query(
    `INSERT INTO risk_decisions (
      correlation_id, user_id, client_order_id, order_type, symbol, side,
      quantity, reference_price, decision, rejection_code, rejection_message,
      rule_version, snapshot, latency_ms
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )`,
    [
      input.correlationId,
      input.userId,
      input.clientOrderId || null,
      input.orderType,
      input.symbol,
      input.side,
      input.quantity,
      input.referencePrice,
      input.decision,
      input.rejectionCode || null,
      input.rejectionMessage || null,
      RULE_VERSION,
      JSON.stringify(input.snapshot),
      Math.max(0, Date.now() - input.startedAt),
    ]
  );
}

async function reject(db, input, code, message, snapshot = {}) {
  const result = {
    approved: false,
    correlationId: input.correlationId,
    code,
    message,
  };

  await persistDecision(db, {
    ...input,
    decision: "REJECTED",
    rejectionCode: code,
    rejectionMessage: message,
    snapshot,
  });
  await appendAuditEvent(db, {
    correlationId: input.correlationId,
    entityType: "ORDER_REQUEST",
    userId: input.userId,
    eventType: "RISK_REJECTED",
    payload: { code, message, snapshot, ruleVersion: RULE_VERSION },
  });
  return result;
}

async function getLivePrice(symbol) {
  const cached = await redisClient.get(`stock:${symbol}`);
  if (!cached) {
    cacheMetrics.misses++;
    return null;
  }
  cacheMetrics.hits++;
  const parsed = JSON.parse(cached);
  const price = Number(parsed.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function evaluateOrder(db, request) {
  const input = {
    startedAt: Date.now(),
    correlationId: request.correlationId || randomUUID(),
    userId: request.userId,
    clientOrderId: request.clientOrderId || null,
    orderType: request.orderType,
    symbol: String(request.symbol || "").trim().toUpperCase(),
    side: String(request.side || "").trim().toUpperCase(),
    quantity: Number(request.quantity),
    referencePrice: Number(request.price),
  };

  if (!["BUY", "SELL"].includes(input.side)) {
    return reject(db, input, "INVALID_SIDE", "Side must be BUY or SELL");
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return reject(db, input, "INVALID_QUANTITY", "Quantity must be a positive whole number");
  }
  if (!Number.isFinite(input.referencePrice) || input.referencePrice <= 0) {
    return reject(db, input, "INVALID_PRICE", "A positive order price is required");
  }
  if (input.clientOrderId && input.clientOrderId.length > 100) {
    return reject(db, input, "INVALID_CLIENT_ORDER_ID", "clientOrderId must be at most 100 characters");
  }

  const snapshot = {
    limits,
    requestedNotional: Number((input.quantity * input.referencePrice).toFixed(2)),
  };

  let withinRateLimit;
  try {
    withinRateLimit = await consumeRateLimit(input.userId);
  } catch (error) {
    return reject(db, input, "RATE_LIMIT_UNAVAILABLE", "Risk rate limiter is unavailable", snapshot);
  }
  if (!withinRateLimit) {
    return reject(db, input, "RATE_LIMIT_EXCEEDED", "Too many orders; please retry shortly", snapshot);
  }

  if (input.quantity > limits.maxQuantity) {
    return reject(db, input, "MAX_QUANTITY_EXCEEDED", "Order quantity exceeds the risk limit", snapshot);
  }
  if (snapshot.requestedNotional > limits.maxOrderValue) {
    return reject(db, input, "MAX_ORDER_VALUE_EXCEEDED", "Order value exceeds the risk limit", snapshot);
  }

  const stock = await db.query(
    "SELECT symbol, last_price FROM stocks WHERE symbol = $1 AND is_active = TRUE",
    [input.symbol]
  );
  if (!stock.rows[0]) {
    return reject(db, input, "INSTRUMENT_NOT_TRADABLE", "Instrument is not available for trading", snapshot);
  }

  const halt = await db.query(
    `SELECT scope, trading_enabled, reason
     FROM risk_controls
     WHERE (scope = 'GLOBAL' AND symbol IS NULL)
        OR (scope = 'SYMBOL' AND symbol = $1)`,
    [input.symbol]
  );
  const activeHalt = halt.rows.find((control) => !control.trading_enabled);
  if (activeHalt) {
    return reject(
      db,
      input,
      "CIRCUIT_BREAKER_ACTIVE",
      activeHalt.reason || "Trading is temporarily halted by risk controls",
      { ...snapshot, controlScope: activeHalt.scope }
    );
  }

  let marketPrice;
  try {
    marketPrice = request.marketPrice || await getLivePrice(input.symbol);
  } catch (error) {
    return reject(db, input, "MARKET_DATA_UNAVAILABLE", "Live price is not available", snapshot);
  }
  marketPrice = Number(marketPrice);
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
    return reject(db, input, "MARKET_DATA_UNAVAILABLE", "Live price is not available", snapshot);
  }

  const lowerBand = marketPrice * (1 - limits.priceBandPercent / 100);
  const upperBand = marketPrice * (1 + limits.priceBandPercent / 100);
  snapshot.marketPrice = marketPrice;
  snapshot.priceBand = { lower: lowerBand, upper: upperBand };
  if (input.referencePrice < lowerBand || input.referencePrice > upperBand) {
    return reject(db, input, "PRICE_BAND_BREACH", "Order price is outside the permitted risk band", snapshot);
  }

  if (input.clientOrderId) {
    const duplicate = await db.query(
      "SELECT id FROM risk_decisions WHERE user_id = $1 AND client_order_id = $2",
      [input.userId, input.clientOrderId]
    );
    if (duplicate.rows[0]) {
      return reject(db, { ...input, clientOrderId: null }, "DUPLICATE_ORDER", "clientOrderId has already been used", snapshot);
    }
  }

  const account = await db.query(
    "SELECT balance FROM users WHERE user_id = $1 FOR UPDATE",
    [input.userId]
  );
  if (!account.rows[0]) {
    return reject(db, input, "ACCOUNT_NOT_FOUND", "Trading account was not found", snapshot);
  }

  // The account lock serializes concurrent requests for this customer. Repeat
  // the idempotency check here so a second in-flight request sees the first
  // request's committed decision instead of reaching the unique constraint.
  if (input.clientOrderId) {
    const duplicateAfterLock = await db.query(
      "SELECT id FROM risk_decisions WHERE user_id = $1 AND client_order_id = $2",
      [input.userId, input.clientOrderId]
    );
    if (duplicateAfterLock.rows[0]) {
      return reject(db, { ...input, clientOrderId: null }, "DUPLICATE_ORDER", "clientOrderId has already been used", snapshot);
    }
  }

  const dailyPnl = await db.query(
    `SELECT realized_pnl FROM risk_daily_pnl
     WHERE user_id = $1 AND trading_date = CURRENT_DATE`,
    [input.userId]
  );
  const realizedPnl = Number(dailyPnl.rows[0]?.realized_pnl || 0);
  snapshot.dailyRealizedPnl = realizedPnl;
  if (input.side === "BUY" && realizedPnl <= -limits.dailyLossLimit) {
    return reject(
      db,
      input,
      "DAILY_LOSS_LIMIT_REACHED",
      "Daily loss limit reached; only risk-reducing sell orders are allowed",
      snapshot
    );
  }

  if (input.side === "BUY") {
    const balance = Number(account.rows[0].balance);
    snapshot.availableBuyingPower = balance;
    if (balance < snapshot.requestedNotional) {
      return reject(db, input, "INSUFFICIENT_BUYING_POWER", "Insufficient buying power", snapshot);
    }

    const pendingBuys = await db.query(
      `SELECT COALESCE(SUM(quantity), 0) AS quantity
       FROM limit_orders
       WHERE user_id = $1 AND symbol = $2 AND side = 'BUY' AND status = 'PENDING'`,
      [input.userId, input.symbol]
    );
    const held = await db.query(
      "SELECT COALESCE(quantity, 0) AS quantity FROM portfolio_holdings WHERE user_id = $1 AND symbol = $2",
      [input.userId, input.symbol]
    );
    const projected = Number(held.rows[0]?.quantity || 0) +
      Number(pendingBuys.rows[0].quantity || 0) + input.quantity;
    snapshot.projectedPositionQuantity = projected;
    if (projected > limits.maxPositionQuantity) {
      return reject(db, input, "POSITION_LIMIT_EXCEEDED", "Projected position exceeds the risk limit", snapshot);
    }
  } else {
    const holding = await db.query(
      "SELECT quantity FROM portfolio_holdings WHERE user_id = $1 AND symbol = $2 FOR UPDATE",
      [input.userId, input.symbol]
    );
    const heldQuantity = Number(holding.rows[0]?.quantity || 0);
    const reserved = await db.query(
      `SELECT
        COALESCE((SELECT SUM(quantity) FROM limit_orders
          WHERE user_id = $1 AND symbol = $2 AND side = 'SELL' AND status = 'PENDING'), 0)
        + COALESCE((SELECT SUM(quantity) FROM stop_orders
          WHERE user_id = $1 AND symbol = $2 AND side = 'SELL'
            AND status = 'PENDING' AND linked_limit_order_id IS NULL), 0)
        + COALESCE((SELECT SUM(quantity) FROM risk_reservations
          WHERE user_id = $1 AND symbol = $2 AND reservation_type = 'HOLDINGS'
            AND status = 'ACTIVE'), 0) AS quantity`,
      [input.userId, input.symbol]
    );
    let linkedReservation = 0;
    if (request.linkedLimitOrderId) {
      const linked = await db.query(
        `SELECT quantity FROM limit_orders
         WHERE id = $1 AND user_id = $2 AND symbol = $3
           AND side = 'SELL' AND status = 'PENDING'`,
        [request.linkedLimitOrderId, input.userId, input.symbol]
      );
      linkedReservation = Number(linked.rows[0]?.quantity || 0);
    }
    const reservedQuantity = Number(reserved.rows[0].quantity || 0);
    const available = heldQuantity - reservedQuantity + linkedReservation;
    snapshot.holdings = { heldQuantity, reserved: reservedQuantity, linkedReservation, available };
    if (input.quantity > available) {
      return reject(db, input, "INSUFFICIENT_HOLDINGS", "Insufficient unreserved holdings", snapshot);
    }
  }

  await persistDecision(db, {
    ...input,
    decision: "APPROVED",
    snapshot,
  });

  const reservationType = input.side === "BUY" ? "CASH" : "HOLDINGS";
  const reservationStatus = request.orderType === "MARKET" ? "CONSUMED" : "ACTIVE";
  const releasedAt = reservationStatus === "CONSUMED" ? new Date() : null;
  await db.query(
    `INSERT INTO risk_reservations (
      correlation_id, user_id, reservation_type, symbol, amount, quantity, status, released_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.correlationId,
      input.userId,
      reservationType,
      input.symbol,
      reservationType === "CASH" ? snapshot.requestedNotional : 0,
      reservationType === "HOLDINGS" ? input.quantity : 0,
      reservationStatus,
      releasedAt,
    ]
  );
  await appendAuditEvent(db, {
    correlationId: input.correlationId,
    entityType: "ORDER_REQUEST",
    userId: input.userId,
    eventType: "RISK_APPROVED",
    payload: { snapshot, ruleVersion: RULE_VERSION },
  });

  return {
    approved: true,
    correlationId: input.correlationId,
    snapshot,
  };
}

async function getOrderTimeline(orderId, userId) {
  const database = require("../../../config/postgre");
  const result = await database.query(
    `SELECT sequence, correlation_id, entity_type, entity_id, event_type, payload, created_at
     FROM audit_events
     WHERE user_id = $2
       AND (
         entity_id = $1
         OR correlation_id IN (
           SELECT correlation_id FROM risk_reservations WHERE order_id = $1
         )
       )
     ORDER BY sequence ASC`,
    [orderId, userId]
  );
  return result.rows;
}

async function setTradingControl({ symbol, tradingEnabled, reason, updatedBy }) {
  const database = require("../../../config/postgre");
  const normalizedSymbol = symbol ? String(symbol).trim().toUpperCase() : null;
  const scope = normalizedSymbol ? "SYMBOL" : "GLOBAL";
  const query = normalizedSymbol
    ? `INSERT INTO risk_controls (scope, symbol, trading_enabled, reason, updated_by)
       VALUES ('SYMBOL', $1, $2, $3, $4)
       ON CONFLICT (scope, symbol)
       DO UPDATE SET trading_enabled = EXCLUDED.trading_enabled,
                     reason = EXCLUDED.reason,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`
    : `INSERT INTO risk_controls (scope, symbol, trading_enabled, reason, updated_by)
       VALUES ('GLOBAL', NULL, $1, $2, $3)
       ON CONFLICT (scope) WHERE scope = 'GLOBAL'
       DO UPDATE SET trading_enabled = EXCLUDED.trading_enabled,
                     reason = EXCLUDED.reason,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`;
  const values = normalizedSymbol
    ? [normalizedSymbol, Boolean(tradingEnabled), reason || null, updatedBy]
    : [Boolean(tradingEnabled), reason || null, updatedBy];
  const result = await database.query(query, values);
  return result.rows[0];
}

function getRiskMetrics() {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  return {
    redisHitRatio: total ? Number((cacheMetrics.hits / total).toFixed(4)) : null,
    redisReads: total,
  };
}

module.exports = {
  appendAuditEvent,
  appendOrderAuditEvent,
  consumeReservation,
  evaluateOrder,
  getOrderTimeline,
  recordRealizedPnl,
  setTradingControl,
  getRiskMetrics,
};
