const {
  createStopOrder,
  getUserStopOrders,
  cancelStopOrder,
  getStopOrderById,
  lockPendingStopOrderById,
  getPendingStopOrders,
  markStopOrderFilled,
  expireDayStopOrders,
  cancelOrphanedLinkedStopOrders,
} = require(
  "../repositories/stopOrder.repository"
);

const pool = require(
  "../../../config/postgre"
);

const matchingEngine = require(
  "../../../matching-engine"
);

const {
  redisClient,
} = require(
  "../../../config/redis"
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
  getLimitOrderById,
  lockPendingLimitOrderById,
} = require(
  "../../limit-order/repositories/limitOrder.repository"
);

const {
  getReservedSellQuantity,
} = require(
  "../../oco/repositories/reservation.repository"
);

const {
  cancelLinkedLimitForStopOrder,
} = require(
  "../../oco/services/oco.service"
);

async function placeStopOrder(
  userId,
  data
) {
  const {
    symbol,
    side,
    quantity,
    validity = "DAY",
  } = data;

  const stopPrice =
    data.stopPrice ??
    data.stop_price;

  const linkedLimitOrderId =
    data.linkedLimitOrderId ??
    data.linked_limit_order_id ??
    null;

  if (
    !symbol ||
    !side ||
    !quantity ||
    !stopPrice
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
  if (stopPrice < lowerPriceBound || stopPrice > upperPriceBound) {
    throw new Error(
      `Stop price must be within ±25% of current price (₹${lowerPriceBound.toFixed(2)} - ₹${upperPriceBound.toFixed(2)})`
    );
  }

  if (side === "BUY" && stopPrice <= currentPrice) {
    throw new Error(
      `Stop price for buying must be above the current market price (₹${currentPrice.toFixed(2)})`
    );
  }

  if (side === "SELL" && stopPrice >= currentPrice) {
    throw new Error(
      `Stop price for selling must be below the current market price (₹${currentPrice.toFixed(2)})`
    );
  }

  if (linkedLimitOrderId) {
    if (side !== "SELL") {
      throw new Error(
        "OCO linking is only supported for SELL stop orders"
      );
    }

    const linkedOrder =
      await getLimitOrderById(
        linkedLimitOrderId
      );

    if (
      !linkedOrder ||
      String(linkedOrder.userId) !== String(userId) ||
      linkedOrder.status !== "PENDING"
    ) {
      throw new Error(
        "Linked limit order not found"
      );
    }

    if (
      linkedOrder.symbol !== symbol ||
      linkedOrder.side !== "SELL"
    ) {
      throw new Error(
        "Linked limit order must be a SELL order for the same stock"
      );
    }

    if (
      Number(linkedOrder.quantity) !==
      Number(quantity)
    ) {
      throw new Error(
        "Linked limit order quantity must match the stop order quantity"
      );
    }

    if (
      (linkedOrder.validity || "DAY") !==
      validity
    ) {
      throw new Error(
        "Linked limit order validity must match the stop order validity"
      );
    }
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

    if (
      Number(holding.quantity) <
      Number(quantity)
    ) {
      throw new Error(
        "Insufficient holdings"
      );
    }

    // A linked (OCO) stop shares the reservation of its limit leg —
    // at most one of the two legs can ever fill.
    if (!linkedLimitOrderId) {
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
    }
  }

  let order;
  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    if (linkedLimitOrderId) {
      const lockedLimitOrder =
        await lockPendingLimitOrderById(
          linkedLimitOrderId,
          client
        );

      if (!lockedLimitOrder) {
        throw new Error(
          "Linked limit order is no longer active"
        );
      }
    }

    if (side === "BUY") {
      const totalCost = Number(stopPrice) * Number(quantity);
      const userRes = await client.query("SELECT balance FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
      const currentBalance = userRes.rows[0] ? Number(userRes.rows[0].balance) : 0;
      if (currentBalance < totalCost) {
        throw new Error(`Insufficient cash balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}`);
      }

      await client.query("UPDATE users SET balance = balance - $1 WHERE user_id = $2", [totalCost, userId]);
    }

    order =
      await createStopOrder({
        userId,
        symbol,
        side,
        quantity,
        stopPrice,
        validity,
        linkedLimitOrderId,
      }, client);

    addStopOrderToMatchingEngine(order);

    await createNotification({
      userId,
      title:
        "Stop Order Placed",
      message:
        `Your ${side} stop order for ${symbol} has been placed. Quantity: ${quantity}. Stop Price: ₹${stopPrice}.` +
        (linkedLimitOrderId
          ? " Linked to your limit order (OCO)."
          : ""),
    }, client);

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
      matchingEngine.cancelStopOrder(
        order.symbol,
        order.id
      );
    }

    if (error.code === "23505") {
      throw new Error(
        "This limit order already has a linked stop order"
      );
    }

    throw error;
  } finally {
    client.release();
  }

  return order;
}

async function listStopOrders(
  userId
) {
  return getUserStopOrders(
    userId
  );
}

async function removeStopOrder(
  id,
  userId
) {
  const existingOrder =
    await getStopOrderById(id);

  if (
    !existingOrder ||
    String(existingOrder.userId) !== String(userId) ||
    existingOrder.status !== "PENDING"
  ) {
    throw new Error(
      "Stop order not found"
    );
  }

  const removedFromEngine =
    matchingEngine.cancelStopOrder(
      existingOrder.symbol,
      existingOrder.id
    );

  const client =
    await pool.connect();

  let order;
  let cancelledLimitOrder = null;

  try {
    await client.query("BEGIN");

    order =
      await cancelStopOrder(
        id,
        userId,
        client
      );

    if (!order) {
      throw new Error(
        "Stop order not found"
      );
    }

    if (order.side === "BUY") {
      const refund = Number(order.quantity) * Number(order.stopPrice || order.stop_price);
      await client.query("UPDATE users SET balance = balance + $1 WHERE user_id = $2", [refund, userId]);
    }

    await createNotification({
      userId,
      title:
        "Stop Order Cancelled",
      message:
        `Your ${order.side} stop order for ${order.symbol} has been cancelled.`,
    }, client);

    // OCO group semantics: cancelling one leg cancels the other.
    cancelledLimitOrder =
      await cancelLinkedLimitForStopOrder(
        order,
        "you cancelled its linked stop order (OCO)",
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
      await restorePendingStopOrderToEngine(id);
    }

    throw error;
  } finally {
    client.release();
  }

  if (cancelledLimitOrder) {
    matchingEngine.cancelOrder(
      cancelledLimitOrder.symbol,
      cancelledLimitOrder.id
    );
  }

  return order;
}

async function loadPendingStopOrdersIntoMatchingEngine() {
  const orphanedOrders =
    await cancelOrphanedLinkedStopOrders();

  for (const order of orphanedOrders) {
    await createNotification({
      userId:
        order.userId,
      title:
        "Stop Order Cancelled (OCO)",
      message:
        `Your ${order.side} stop order for ${order.symbol} was auto-cancelled because its linked limit order is no longer active.`,
    });
  }

  const orders =
    await getPendingStopOrders();

  for (const order of orders) {
    addStopOrderToMatchingEngine(order);
  }

  return orders.length;
}

async function processMarketPriceForStopOrders(
  symbol,
  currentPrice
) {
  const trades =
    matchingEngine.processMarketPriceForStops(
      symbol,
      Number(currentPrice)
    );

  if (!trades.length) {
    return [];
  }

  try {
    await settleExecutedStopTrades(trades);
    return trades;
  } catch (error) {
    await restoreStopTradesToMatchingEngine(
      trades
    );
    throw error;
  }
}

async function settleExecutedStopTrades(
  trades
) {
  const client =
    await pool.connect();

  const limitOrdersToRemoveFromEngine = [];
  const executedUserIds = new Set();

  try {
    await client.query("BEGIN");

    for (const trade of trades) {
      const order =
        await lockPendingStopOrderById(
          trade.orderId,
          client
        );

      if (!order) {
        continue;
      }

      executedUserIds.add(order.userId);

      await markStopOrderFilled({
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
      }

      await createNotification({
        userId:
          order.userId,
        title:
          "Stop Order Executed",
        message:
          `Your ${order.side} stop order for ${order.symbol} has been executed. Quantity: ${order.quantity}. Executed Price: ₹${trade.executedPrice}.`,
      }, client);

      const cancelledLimitOrder =
        await cancelLinkedLimitForStopOrder(
          order,
          "its linked stop order executed (OCO)",
          client
        );

      if (cancelledLimitOrder) {
        limitOrdersToRemoveFromEngine.push(
          cancelledLimitOrder
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
        console.error(`Failed to sync Redis balance for user ${uId} after stop execution:`, redisErr.message);
      }
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  for (const limitOrder of limitOrdersToRemoveFromEngine) {
    matchingEngine.cancelOrder(
      limitOrder.symbol,
      limitOrder.id
    );
  }
}

async function expireStopDayOrders() {
  const pendingOrders =
    await getPendingStopOrders();

  const dayOrders =
    pendingOrders.filter(
      (order) =>
        (order.validity || "DAY") ===
        "DAY"
    );

  for (const order of dayOrders) {
    matchingEngine.cancelStopOrder(
      order.symbol,
      order.id
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const expiredOrders =
      await expireDayStopOrders(
        client
      );

    const expiredUserIds = new Set();

    for (const order of expiredOrders) {
      if (order.side === "BUY") {
        const refund = Number(order.quantity) * Number(order.stopPrice || order.stop_price);
        await client.query("UPDATE users SET balance = balance + $1 WHERE user_id = $2", [refund, order.userId]);
        expiredUserIds.add(order.userId);
      }

      await createNotification({
        userId:
          order.userId,
        title:
          "DAY Stop Order Expired",
        message:
          `Your ${order.side} DAY stop order for ${order.symbol} has expired.`,
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
        console.error(`Failed to sync Redis balance for user ${uId} after stop expiration:`, redisErr.message);
      }
    }

    return expiredOrders;
  } catch (error) {
    await client.query("ROLLBACK");

    for (const order of dayOrders) {
      addStopOrderToMatchingEngine(order);
    }

    throw error;
  } finally {
    client.release();
  }
}

async function restoreStopTradesToMatchingEngine(
  trades
) {
  for (const trade of trades) {
    await restorePendingStopOrderToEngine(
      trade.orderId
    );
  }
}

async function restorePendingStopOrderToEngine(
  orderId
) {
  const order =
    await getStopOrderById(orderId);

  if (
    !order ||
    order.status !== "PENDING" ||
    matchingEngine.getStopOrder(
      order.symbol,
      order.id
    )
  ) {
    return;
  }

  addStopOrderToMatchingEngine(order);
}

function addStopOrderToMatchingEngine(order) {
  if (
    matchingEngine.getStopOrder(
      order.symbol,
      order.id
    )
  ) {
    return;
  }

  matchingEngine.placeStopOrder({
    id: order.id,
    userId: order.userId,
    symbol: order.symbol,
    side: order.side,
    quantity:
      Number(order.quantity),
    stopPrice:
      Number(order.stopPrice),
    validity:
      order.validity || "DAY",
    createdAt:
      order.createdAt,
    expiresAt:
      order.expiresAt || null,
  });
}


module.exports = {
  placeStopOrder,
  listStopOrders,
  removeStopOrder,
  loadPendingStopOrdersIntoMatchingEngine,
  processMarketPriceForStopOrders,
  expireStopDayOrders,
};
