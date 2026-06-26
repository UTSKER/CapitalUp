const redisClient = require(
  "../../../config/redis"
);

async function saveStockData(
  symbol,
  stockData
) {
  await redisClient.set(
    `stock:${symbol}`,
    JSON.stringify(stockData)
  );
}

async function getStockData(
  symbol
) {
  const data =
    await redisClient.get(
      `stock:${symbol}`
    );

  return data
    ? JSON.parse(data)
    : null;
}

module.exports = {
  saveStockData,
  getStockData,
};