const {
  getActiveSymbols,
  saveStockData,
} = require(
  "../repositories/marketdata.repository"
);

const {
  getStockPrice,
} = require(
  "../../stocks/services/stock.service"
);

async function refreshMarketData() {
  const symbols =
    await getActiveSymbols();

  if (!symbols.length) {
    console.log(
      "No active symbols found"
    );
    return;
  }

  console.log(
    `Refreshing ${symbols.length} symbols`
  );

  for (const symbol of symbols) {
    try {
      const stockData =
        await getStockPrice(
          symbol
        );

      stockData.updatedAt =
        new Date().toISOString();

      await saveStockData(
        symbol,
        stockData
      );

      console.log(
        `Updated ${symbol}`
      );
    } catch (error) {
      console.error(
        `Failed to update ${symbol}`,
        error.message
      );
    }
  }
}

module.exports = {
  refreshMarketData,
};