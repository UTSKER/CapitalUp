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
const {
  recordMarketTick,
} = require("./replay.service");

function isRealIndianMarketOpen() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5));
  const day = istTime.getDay();
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();

  if (day === 0 || day === 6) {
    return false;
  }

  const timeInMinutes = (hours * 60) + minutes;
  const marketStart = (9 * 60) + 15; // 9:15 AM
  const marketEnd = (15 * 60) + 30;  // 3:30 PM

  return timeInMinutes >= marketStart && timeInMinutes <= marketEnd;
}

function isIndianMarketOpen() {
  if (process.env.BYPASS_MARKET_HOURS === "true") {
    return true;
  }
  return isRealIndianMarketOpen();
}

async function refreshMarketData(force = false) {
  if (!force && !isIndianMarketOpen()) {
    console.log("Indian stock markets are closed. Skipping live price updates.");
    return;
  }

  const symbols = await getTrackedStockSymbols();

  if (!symbols.length) {
    console.log("No active symbols found");
    return;
  }

  console.log(`Refreshing ${symbols.length} symbols`);

  for (const symbol of symbols) {
    try {
      const stockData = await getStockPrice(symbol);

      if (isRealIndianMarketOpen()) {
        stockData.updatedAt = new Date().toISOString();
      } else {
        stockData.updatedAt = stockData.updatedAt || new Date().toISOString();
      }

      await recordMarketTick({
        symbol,
        price: stockData.price,
        timestamp: stockData.updatedAt,
        payload: stockData,
      });

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

      if (isIndianMarketOpen()) {
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
  isIndianMarketOpen,
  isRealIndianMarketOpen,
};
