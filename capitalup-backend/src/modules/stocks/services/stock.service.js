const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

const {
  searchStocks: searchStocksRepo,
} = require(
  "../repositories/stock.repository"
);

async function searchStocks(query) {
  if (!query?.trim()) {
    return [];
  }

  return await searchStocksRepo(
    query
  );
}

async function getStockPrice(symbol) {
  try {
    const quote =
      await yahooFinance.quote(symbol);

    if (
      !quote ||
      quote.regularMarketPrice == null
    ) {
      throw new Error(
        `No price data available for ${symbol}`
      );
    }

    return {
      symbol,
      price:
        quote.regularMarketPrice,
      high:
        quote.regularMarketDayHigh,
      low:
        quote.regularMarketDayLow,
      open:
        quote.regularMarketOpen,
      previousClose:
        quote.regularMarketPreviousClose,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch price for ${symbol}: ${error.message}`
    );
  }
}

module.exports = {
  searchStocks,
  getStockPrice,
};