const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});


async function searchStocks(query) {
  try {
    const response =
      await yahooFinance.search(query);

    return response.quotes
    .filter((stock) =>
      stock.symbol &&
      stock.symbol.endsWith(".NS")
    )
    .map((stock) => ({
      symbol: stock.symbol,
      name:
        stock.longname ||
        stock.shortname ||
        stock.symbol,
      type:
        stock.quoteType ||
        stock.typeDisp,
    }));
  } catch (error) {
    throw new Error(
      `Failed to search stocks: ${error.message}`
    );
  }
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
      price: quote.regularMarketPrice,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      open: quote.regularMarketOpen,
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
