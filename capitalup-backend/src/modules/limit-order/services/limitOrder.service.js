const {
  createLimitOrder,
  getUserLimitOrders,
  cancelLimitOrder,
  getPendingSellQuantity,
  getLimitOrderById,
  lockPendingLimitOrderById,
  getPendingLimitOrders,
  markLimitOrderFilled,
  expireDayLimitOrders,
  createLimitOrderTrade,
} = require(
  "../repositories/limitOrder.repository"
);

const pool = require(
  "../../../config/postgre"
);

const matchingEngine = require(
  "../../../matching-engine"
);

const {
  createOrder,
} = require(
  "../../orders/repositories/order.repository"
);

const {
  buyStock,
  sellStock,
} = require(
  "../../portfolio/services/portfolio.service"
);

const producer = require("../../../kafka/producer.js");
const topics = require("../../../kafka/topics.js");

const {
  createNotification,
} = require(
  "../../notification/services/notification.service"
);

const {
  findHoldingBySymbol,
} = require(
  "../../portfolio/repositories/portfolio.repository"
);

const {
  findStockBySymbol,
} = require(
  "../../stocks/repositories/stock.repository"
);

const {
  redisClient,
} = require(
  "../../../config/redis"
);

const {
  getReservedSellQuantity,
} = require(
  "../../oco/repositories/reservation.repository"
);

const {
  cancelLinkedStopForLimitOrder,
} = require(
  "../../oco/services/oco.service"
);
const {
  appendAuditEvent,
  appendOrderAuditEvent,
  consumeReservation,
  evaluateOrder,
  recordRealizedPnl,
} = require("../../risk/services/risk.service");

async function placeLimitOrder(
  userId,
  data
) {
  const {
    symbol,
    side,
    quantity,
    validity = "DAY",
  } = data;

  const limitPrice =
    data.limitPrice ??
    data.limit_price;

  if (
    !symbol ||
    !side ||
    !quantity ||
    !limitPrice
  ) {
    throw new Error(
      "Missing required fields"
    );
  }

  if (
    side !== "BUY" &&
    side !== "SELL"
  ) {
    throw new Error(
      "Side must be BUY or SELL"
    );
  }

  if (
    validity !== "DAY" &&
    validity !== "GTT"
  ) {
    throw new Error(
      "Validity must be DAY or GTT"
    );
  }

  const stock =
    await findStockBySymbol(
      symbol
    );

  if (!stock) {
    throw new Error(
      "Stock not found"
    );
  }

  const cachedPrice = await redisClient.get(`stock:${symbol}`);
  if (!cachedPrice) {
    throw new Error("Live price not available for this symbol");
  }
  const parsedPrice = JSON.parse(cachedPrice);
  const currentPrice = Number(parsedPrice.price);
  const lowerPriceBound = currentPrice * 0.75;
  const upperPriceBound = currentPrice * 1.25;
  if (limitPrice < lowerPriceBound || limitPrice > upperPriceBound) {
    throw new Error(
      `Limit price must be within ±25% of current price (₹${lowerPriceBound.toFixed(2)} - ₹${upperPriceBound.toFixed(2)})`
    );
  }

  if (side === "BUY" && limitPrice > currentPrice) {
    throw new Error(
      `Limit price for buying cannot be greater than the current market price (₹${currentPrice.toFixed(2)})`
    );
  }

  if (side === "SELL") {
    const holding =
      await findHoldingBySymbol(
        userId,
        symbol
      );

    if (!holding) {
      throw new Error(
        "You do not own this stock"
      );
    }

    const reservedQuantity =
      await getReservedSellQuantity(
        userId,
        symbol
      );

    const availableQuantity =
      Number(holding.quantity) -
      reservedQuantity;

    if (
      Number(quantity) >
      availableQuantity
    ) {
      throw new Error(
        `Only ${availableQuantity} shares available`
      );
    }
  

    if (
      Number(
        holding.quantity
      ) <
      Number(quantity)
    ) {
      throw new Error(
        "Insufficient holdings"
      );
    }
  }

  let order;
  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const risk = await evaluateOrder(client, {
      userId,
      clientOrderId: data.clientOrderId,
      orderType: "LIMIT",
      symbol,
      side,
      quantity: Number(quantity),
      price: Number(limitPrice),
      marketPrice: currentPrice,
    });
    if (!risk.approved) {
      await client.query("COMMIT");
      const error = new Error(risk.message);
      error.code = risk.code;
      error.statusCode = 422;
      throw error;
    }

    if (side === "BUY") {
      const totalCost = Number(limitPrice) * Number(quantity);
      const userRes = await client.query("SELECT balance FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
      const currentBalance = userRes.rows[0] ? Number(userRes.rows[0].balance) : 0;
      if (currentBalance < totalCost) {
        throw new Error(`Insufficient cash balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}`);
      }

      await client.query("UPDATE users SET balance = balance - $1 WHERE user_id = $2", [totalCost, userId]);
    }

    order =
      await createLimitOrder({
        userId,
        symbol,
        side,
        quantity,
        limitPrice,
        validity,
      }, client);

    await consumeReservation(client, risk.correlationId, order.id);
    addOrderToMatchingEngine(order);

    await appendAuditEvent(client, {
      correlationId: risk.correlationId,
      entityType: "LIMIT_ORDER",
      entityId: order.id,
      userId,
      eventType: "ORDER_ADDED_TO_BOOK",
      payload: {
        symbol,
        side,
        quantity: Number(quantity),
        limitPrice: Number(limitPrice),
        validity,
      },
    });

    await producer.publish(topics.NOTIFICATION, {
      event: "LIMIT_ORDER_PLACED",
      userId,
      title:
        "Limit Order Placed",
      message:
        `Your ${side} limit order for ${symbol} has been placed. Quantity: ${quantity}. Limit Price: ₹${limitPrice}.`,
    });

    await client.query("COMMIT");

    // Sync updated balance to Redis cache
    const balResult = await pool.query("SELECT balance FROM users WHERE user_id = $1", [userId]);
    if (balResult.rows[0]) {
      const { syncBalanceToRedis } = require("../../portfolio/services/balance.service");
      await syncBalanceToRedis(userId, Number(balResult.rows[0].balance));
    }
  } catch (error) {
    await client.query("ROLLBACK");

    if (order) {
      matchingEngine.cancelOrder(
        order.symbol,
        order.id
      );
    }

    throw error;
  } finally {
    client.release();
  }

  return order;
}

async function listLimitOrders(
  userId
) {
  return getUserLimitOrders(
    userId
  );
}

async function removeLimitOrder(
  id,
  userId
) {
  const existingOrder =
    await getLimitOrderById(id);

  if (
    !existingOrder ||
    String(existingOrder.userId) !== String(userId) ||
    existingOrder.status !== "PENDING"
  ) {
    throw new Error(
      "Limit order not found"
    );
  }

  const removedFromEngine =
    matchingEngine.cancelOrder(
      existingOrder.symbol,
      existingOrder.id
    );

  const client =
    await pool.connect();

  let order;
  let cancelledStopOrder = null;

  try {
    await client.query("BEGIN");

    order =
      await cancelLimitOrder(
        id,
        userId,
        client
      );

    if (!order) {
      throw new Error(
        "Limit order not found"
      );
    }

    await appendOrderAuditEvent(client, {
      orderId: order.id,
      userId,
      entityType: "LIMIT_ORDER",
      eventType: "ORDER_CANCELLED",
      payload: { symbol: order.symbol, side: order.side, quantity: Number(order.quantity) },
    });

    if (order.side === "BUY") {
      const refund = Number(order.quantity) * Number(order.limitPrice || order.limit_price);
      await client.query("UPDATE users SET balance = balance + $1 WHERE user_id = $2", [refund, userId]);
    }

    await createNotification({
      userId,
      title:
        "Limit Order Cancelled",
      message:
        `Your ${order.side} limit order for ${order.symbol} has been cancelled.`,
    }, client);

    // OCO group semantics: cancelling one leg cancels the other.
    cancelledStopOrder =
      await cancelLinkedStopForLimitOrder(
        id,
        "you cancelled its linked limit order (OCO)",
        client
      );

    await client.query("COMMIT");

    // Sync updated balance to Redis cache
    const balResult = await pool.query("SELECT balance FROM users WHERE user_id = $1", [userId]);
    if (balResult.rows[0]) {
      const { syncBalanceToRedis } = require("../../portfolio/services/balance.service");
      await syncBalanceToRedis(userId, Number(balResult.rows[0].balance));
    }
  } catch (error) {
    await client.query("ROLLBACK");

    if (removedFromEngine) {
      await restorePendingOrderToEngine(id);
    }

    throw error;
  } finally {
    client.release();
  }

  if (cancelledStopOrder) {
    matchingEngine.cancelStopOrder(
      cancelledStopOrder.symbol,
      cancelledStopOrder.id
    );
  }

  if (!order) {
    throw new Error(
      "Limit order not found"
    );
  }

  return order;
}

async function loadPendingLimitOrdersIntoMatchingEngine() {
  const orders =
    await getPendingLimitOrders();

  for (const order of orders) {
    addOrderToMatchingEngine(order);
  }

  return orders.length;
}

async function processMarketPriceForLimitOrders(
  symbol,
  currentPrice
) {
  const trades =
    matchingEngine.processMarketPrice(
      symbol,
      Number(currentPrice)
    );

  if (!trades.length) {
    return [];
  }

  try {
    await settleExecutedTrades(trades);
    return trades;
  } catch (error) {
    await restoreTradesToMatchingEngine(
      trades
    );
    throw error;
  }
}

async function settleExecutedTrades(
  trades
) {
  const client =
    await pool.connect();

  const stopOrdersToRemoveFromEngine = [];
  const executedUserIds = new Set();

  try {
    await client.query("BEGIN");

    for (const trade of trades) {
      const order =
        await lockPendingLimitOrderById(
          trade.orderId,
          client
        );

      if (!order) {
        continue;
      }

      executedUserIds.add(order.userId);

      await markLimitOrderFilled({
        id: order.id,
        executedPrice:
          trade.executedPrice,
      }, client);

      await createOrder({
        userId:
          order.userId,
        symbol:
          order.symbol,
        side:
          order.side,
        quantity:
          Number(order.quantity),
        price:
          trade.executedPrice,
        status:
          "EXECUTED",
      }, client);

      await appendOrderAuditEvent(client, {
        orderId: order.id,
        userId: order.userId,
        entityType: "LIMIT_ORDER",
        eventType: "ORDER_EXECUTED",
        payload: {
          symbol: order.symbol,
          side: order.side,
          quantity: Number(order.quantity),
          price: Number(trade.executedPrice),
        },
      });

      if (order.side === "BUY") {
        await buyStock({
          userId:
            order.userId,
          symbol:
            order.symbol,
          quantity:
            Number(order.quantity),
          price:
            Number(
              trade.executedPrice
            ),
        }, client);
      }

      if (order.side === "SELL") {
        const holdingBeforeSale = await client.query(
          "SELECT average_buy_price FROM portfolio_holdings WHERE user_id = $1 AND symbol = $2 FOR UPDATE",
          [order.userId, order.symbol]
        );
        await sellStock({
          userId:
            order.userId,
          symbol:
            order.symbol,
          quantity:
            Number(order.quantity),
        }, client);

        const proceeds = Number(order.quantity) * Number(trade.executedPrice);
        await client.query("UPDATE users SET balance = balance + $1 WHERE user_id = $2", [proceeds, order.userId]);
        await recordRealizedPnl(client, {
          userId: order.userId,
          quantity: Number(order.quantity),
          entryPrice: Number(holdingBeforeSale.rows[0].average_buy_price),
          exitPrice: Number(trade.executedPrice),
          orderId: order.id,
        });
      }

      await appendOrderAuditEvent(client, {
        orderId: order.id,
        userId: order.userId,
        entityType: "LIMIT_ORDER",
        eventType: "PORTFOLIO_UPDATED",
        payload: { symbol: order.symbol, side: order.side, quantity: Number(order.quantity) },
      });

      await createLimitOrderTrade({
        tradeId:
          trade.tradeId,
        limitOrderId:
          order.id,
        userId:
          order.userId,
        symbol:
          order.symbol,
        side:
          order.side,
        quantity:
          Number(order.quantity),
        price:
          trade.executedPrice,
      }, client);

      await createNotification({
        userId:
          order.userId,
        title:
          "Limit Order Executed",
        message:
          `Your ${order.side} limit order for ${order.symbol} has been executed. Quantity: ${order.quantity}. Executed Price: ₹${trade.executedPrice}.`,
      }, client);

      const cancelledStopOrder =
        await cancelLinkedStopForLimitOrder(
          order.id,
          "its linked limit order executed (OCO)",
          client
        );

      if (cancelledStopOrder) {
        stopOrdersToRemoveFromEngine.push(
          cancelledStopOrder
        );
      }
    }

    await client.query("COMMIT");

    // Sync updated balance to Redis cache
    for (const uId of executedUserIds) {
      try {
        const balResult = await pool.query("SELECT balance FROM users WHERE user_id = $1", [uId]);
        if (balResult.rows[0]) {
          const { syncBalanceToRedis } = require("../../portfolio/services/balance.service");
          await syncBalanceToRedis(uId, Number(balResult.rows[0].balance));
        }
      } catch (redisErr) {
        console.error(`Failed to sync Redis balance for user ${uId} after limit execution:`, redisErr.message);
      }
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  for (const stopOrder of stopOrdersToRemoveFromEngine) {
    matchingEngine.cancelStopOrder(
      stopOrder.symbol,
      stopOrder.id
    );
  }
}

async function expireDayOrders() {
  const pendingOrders =
    await getPendingLimitOrders();

  const dayOrders =
    pendingOrders.filter(
      (order) =>
        (order.validity || "DAY") ===
        "DAY"
    );

  for (const order of dayOrders) {
    matchingEngine.cancelOrder(
      order.symbol,
      order.id
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const expiredOrders =
      await expireDayLimitOrders(
        client
      );

    const expiredUserIds = new Set();

    for (const order of expiredOrders) {
      if (order.side === "BUY") {
        const refund = Number(order.quantity) * Number(order.limitPrice || order.limit_price);
        await client.query("UPDATE users SET balance = balance + $1 WHERE user_id = $2", [refund, order.userId]);
        expiredUserIds.add(order.userId);
      }

      await appendOrderAuditEvent(client, {
        orderId: order.id,
        userId: order.userId,
        entityType: "LIMIT_ORDER",
        eventType: "ORDER_EXPIRED",
        payload: { symbol: order.symbol, side: order.side, quantity: Number(order.quantity) },
      });

      await createNotification({
        userId:
          order.userId,
        title:
          "DAY Limit Order Expired",
        message:
          `Your ${order.side} DAY limit order for ${order.symbol} has expired.`,
      }, client);
    }

    await client.query("COMMIT");

    // Sync updated balance to Redis cache
    for (const uId of expiredUserIds) {
      try {
        const balResult = await pool.query("SELECT balance FROM users WHERE user_id = $1", [uId]);
        if (balResult.rows[0]) {
          const { syncBalanceToRedis } = require("../../portfolio/services/balance.service");
          await syncBalanceToRedis(uId, Number(balResult.rows[0].balance));
        }
      } catch (redisErr) {
        console.error(`Failed to sync Redis balance for user ${uId} after limit expiration:`, redisErr.message);
      }
    }

    return expiredOrders;
  } catch (error) {
    await client.query("ROLLBACK");

    for (const order of dayOrders) {
      addOrderToMatchingEngine(order);
    }

    throw error;
  } finally {
    client.release();
  }
}

async function restoreTradesToMatchingEngine(
  trades
) {
  for (const trade of trades) {
    await restorePendingOrderToEngine(
      trade.orderId
    );
  }
}

async function restorePendingOrderToEngine(
  orderId
) {
  const order =
    await getLimitOrderById(orderId);

  if (
    !order ||
    order.status !== "PENDING" ||
    matchingEngine.getOrder(
      order.symbol,
      order.id
    )
  ) {
    return;
  }

  addOrderToMatchingEngine(order);
}

function addOrderToMatchingEngine(order) {
  if (
    matchingEngine.getOrder(
      order.symbol,
      order.id
    )
  ) {
    return;
  }

  matchingEngine.placeOrder({
    id: order.id,
    userId: order.userId,
    symbol: order.symbol,
    side: order.side,
    quantity:
      Number(order.quantity),
    limitPrice:
      Number(order.limitPrice),
    validity:
      order.validity || "DAY",
    createdAt:
      order.createdAt,
    expiresAt:
      order.expiresAt || null,
  });
}


module.exports = {
  placeLimitOrder,
  listLimitOrders,
  removeLimitOrder,
  loadPendingLimitOrdersIntoMatchingEngine,
  processMarketPriceForLimitOrders,
  expireDayOrders,
};
