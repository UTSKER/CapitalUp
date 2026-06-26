const redisClient = require(
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

async function placeOrder({
  userId,
  symbol,
  side,
  quantity,
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

  const order =
    await createOrder({
      userId,
      symbol,
      side,
      quantity,
      price,
      status: "EXECUTED",
    });

  if (side === "BUY") {
    await buyStock({
      userId,
      symbol,
      quantity,
      price,
    });

    await createNotification({
      userId,
      title: "Order Executed",
      message: `Your order to buy ${quantity} shares of ${symbol} at ₹${price} has been executed.`,
    });
  }

  if (side === "SELL") {
    await sellStock({
      userId,
      symbol,
      quantity,
    });

    await createNotification({
      userId,
      title: "Order Executed",
      message : `Your order to sell ${quantity} shares of ${symbol} at ₹${price} has been executed.`,
    });
  }

  return order;
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