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

async function addActiveSymbol(
  symbol
) {
  await redisClient.sAdd(
    "active_symbols",
    symbol
  );
}

async function getActiveSymbols() {
  return await redisClient.sMembers(
    "active_symbols"
  );
}

module.exports = {
  saveStockData,
  getStockData,
  addActiveSymbol,
  getActiveSymbols,
};