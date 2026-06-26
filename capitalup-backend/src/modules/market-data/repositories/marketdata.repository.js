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

async function appendStockHistory(symbol, pricePoint) {
  const key = `stock:${symbol}:history`;
  await redisClient.rPush(key, JSON.stringify(pricePoint));
  await redisClient.lTrim(key, -100, -1);
}

async function getStockHistory(symbol) {
  const key = `stock:${symbol}:history`;
  const data = await redisClient.lRange(key, 0, -1);
  return data.map((item) => JSON.parse(item));
}

module.exports = {
  saveStockData,
  getStockData,
  appendStockHistory,
  getStockHistory,
};