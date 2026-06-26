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
      await getPendingSellQuantity(
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

    order =
      await createLimitOrder({
        userId,
        symbol,
        side,
        quantity,
        limitPrice,
        validity,
      }, client);

    addOrderToMatchingEngine(order);

    await createNotification({
      userId,
      title:
        "Limit Order Placed",
      message:
        `Your ${side} limit order for ${symbol} has been placed. Quantity: ${quantity}. Limit Price: ₹${limitPrice}.`,
    }, client);

    await client.query("COMMIT");
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

    await createNotification({
      userId,
      title:
        "Limit Order Cancelled",
      message:
        `Your ${order.side} limit order for ${order.symbol} has been cancelled.`,
    }, client);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    if (removedFromEngine) {
      await restorePendingOrderToEngine(id);
    }

    throw error;
  } finally {
    client.release();
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
      }

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
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
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

    for (const order of expiredOrders) {
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
