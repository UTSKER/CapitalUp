const pool = require("../../../config/postgre");
const {redisClient} = require(
  "../../../config/redis"
);

const {createNotification} = require(
  "../../notification/services/notification.service"
);

const {
  createOrder,
  getOrdersByUser,
  getOrderById,
} = require(
  "../repositories/order.repository"
);

const {
  buyStock,
  sellStock,
} = require(
  "../../portfolio/services/portfolio.service"
);
const {
  appendAuditEvent,
  consumeReservation,
  evaluateOrder,
  recordRealizedPnl,
} = require("../../risk/services/risk.service");

async function placeOrder({
  userId,
  symbol,
  side,
  quantity,
  clientOrderId,
}) {
  const cachedPrice =
    await redisClient.get(
      `stock:${symbol}`
    );

  if (!cachedPrice) {
    throw new Error(
      "Live price not available"
    );
  }

  const parsedPrice =
    JSON.parse(cachedPrice);

  const price = Number(
    parsedPrice.price
  );

  const totalCost = price * quantity;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const risk = await evaluateOrder(client, {
      userId,
      clientOrderId,
      orderType: "MARKET",
      symbol,
      side,
      quantity,
      price,
      marketPrice: price,
    });
    if (!risk.approved) {
      await client.query("COMMIT");
      const error = new Error(risk.message);
      error.code = risk.code;
      error.statusCode = 422;
      throw error;
    }

    if (side === "BUY") {
      const userRes = await client.query("SELECT balance FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
      const currentBalance = userRes.rows[0] ? Number(userRes.rows[0].balance) : 0;
      if (currentBalance < totalCost) {
        throw new Error(`Insufficient cash balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}`);
      }

      await client.query("UPDATE users SET balance = balance - $1 WHERE user_id = $2", [totalCost, userId]);
    }

    const order =
      await createOrder({
        userId,
        symbol,
        side,
        quantity,
        price,
        status: "EXECUTED",
      }, client);

    if (side === "BUY") {
      await buyStock({
        userId,
        symbol,
        quantity,
        price,
      }, client);

      await createNotification({
        userId,
        title: "Order Executed",
        message: `Your order to buy ${quantity} shares of ${symbol} at ₹${price} has been executed.`,
      }, client);
    }

    if (side === "SELL") {
      const holdingBeforeSale = await client.query(
        "SELECT average_buy_price FROM portfolio_holdings WHERE user_id = $1 AND symbol = $2 FOR UPDATE",
        [userId, symbol]
      );
      await sellStock({
        userId,
        symbol,
        quantity,
      }, client);

      await client.query("UPDATE users SET balance = balance + $1 WHERE user_id = $2", [totalCost, userId]);

      await recordRealizedPnl(client, {
        userId,
        quantity,
        entryPrice: Number(holdingBeforeSale.rows[0].average_buy_price),
        exitPrice: price,
        orderId: order.id,
      });

      await createNotification({
        userId,
        title: "Order Executed",
        message: `Your order to sell ${quantity} shares of ${symbol} at ₹${price} has been executed.`,
      }, client);
    }

    await consumeReservation(client, risk.correlationId, order.id);
    for (const event of [
      { eventType: "ORDER_EXECUTED", payload: { symbol, side, quantity, price } },
      { eventType: "PORTFOLIO_UPDATED", payload: { symbol, side, quantity } },
      { eventType: "NOTIFICATION_QUEUED", payload: { type: "ORDER_EXECUTED" } },
    ]) {
      await appendAuditEvent(client, {
        correlationId: risk.correlationId,
        entityType: "ORDER",
        entityId: order.id,
        userId,
        ...event,
      });
    }

    await client.query("COMMIT");

    // Sync updated balance to Redis cache
    const balResult = await pool.query("SELECT balance FROM users WHERE user_id = $1", [userId]);
    if (balResult.rows[0]) {
      const { syncBalanceToRedis } = require("../../portfolio/services/balance.service");
      await syncBalanceToRedis(userId, Number(balResult.rows[0].balance));
    }

    return order;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getMyOrders(
  userId
) {
  return getOrdersByUser(
    userId
  );
}

async function getSingleOrder(
  orderId
) {
  const order =
    await getOrderById(
      orderId
    );

  if (!order) {
    throw new Error(
      "Order not found"
    );
  }

  return order;
}

module.exports = {
  placeOrder,
  getMyOrders,
  getSingleOrder,
};
