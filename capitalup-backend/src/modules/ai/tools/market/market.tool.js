const stockService = require("../../../stocks/services/stock.service");
const { isRealIndianMarketOpen } = require("../../../market-data/services/marketdata.service");

class MarketTool {
  async execute({ question }) {
    // Parse question to see if they're asking about a specific ticker
    const words = question.toUpperCase().split(/[\s,?.!]+/);
    const stocks = await stockService.getAllStocks();
    const isMarketOpen = isRealIndianMarketOpen();
    
    // Try to find a matching stock symbol in the question words
    const matchingStock = stocks.find(s => 
      words.includes(s.symbol.toUpperCase()) || 
      words.includes(s.symbol.split('.')[0].toUpperCase())
    );

    if (matchingStock) {
      return {
        type: "MARKET",
        data: {
          isMarketOpen,
          single: true,
          stock: matchingStock
        }
      };
    }

    // Default: Return list of all active stocks
    return {
      type: "MARKET",
      data: {
        isMarketOpen,
        single: false,
        stocks: stocks.map(s => ({
          symbol: s.symbol,
          companyName: s.companyName || s.company_name,
          lastPrice: s.lastPrice,
          previousClose: s.previousClose,
          high: s.high,
          low: s.low
        }))
      }
    };
  }
}

module.exports = new MarketTool();
