const redisClient = require(
  "../../../config/redis"
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
  }

  if (side === "SELL") {
    await sellStock({
      userId,
      symbol,
      quantity,
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