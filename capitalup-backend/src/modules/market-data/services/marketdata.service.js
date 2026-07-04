const {
  saveStockData,
  appendStockHistory,
} = require("../repositories/marketdata.repository");

const {
  getStockPrice,
} = require("../../stocks/services/stock.service");

const {
  processMarketPriceForLimitOrders,
} = require("../../limit-order/services/limitOrder.service");

const {
  processMarketPriceForStopOrders,
} = require("../../stop-order/services/stopOrder.service");

const {
  getTrackedStockSymbols,
  updateStockMarketData,
} = require("../../stocks/repositories/stock.repository");

const { publisher } = require("../../../config/redis");

async function refreshMarketData() {
  const symbols = await getTrackedStockSymbols();

  if (!symbols.length) {
    console.log("No active symbols found");
    return;
  }

  console.log(`Refreshing ${symbols.length} symbols`);

  for (const symbol of symbols) {
    try {
      const stockData = await getStockPrice(symbol);

      stockData.updatedAt = new Date().toISOString();

      // Save latest price in Redis
      await saveStockData(symbol, stockData);

      // Publish live update
      await publisher.publish(
        "market:update",
        JSON.stringify({
          symbol,
          stockData,
        })
      );

      try {
        await appendStockHistory(symbol, {
          price: stockData.price,
          timestamp: stockData.updatedAt,
        });
      } catch (histError) {
        console.error(
          `Failed to append history for ${symbol}:`,
          histError.message
        );
      }

      try {
        await updateStockMarketData(symbol, stockData);
      } catch (dbError) {
        console.error(
          `Failed to update stock price in DB for ${symbol}:`,
          dbError.message
        );
      }

      const trades = await processMarketPriceForLimitOrders(
        symbol,
        stockData.price
      );

      // Stop orders run AFTER limit orders so an OCO stop leg is
      // already cancelled when its linked limit order fills this tick.
      const stopTrades = await processMarketPriceForStopOrders(
        symbol,
        stockData.price
      );

      console.log(
        `Updated ${symbol}; executed ${trades.length} limit orders, ${stopTrades.length} stop orders`
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