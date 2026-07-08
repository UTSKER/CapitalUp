const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

const {
  searchStocks: searchStocksRepo,
  getAllActiveStocks,
} = require(
  "../repositories/stock.repository"
);

const {
  getStockData,
  getStockHistory,
} = require(
  "../../market-data/repositories/marketdata.repository"
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

    console.log(`[Yahoo Finance API Fetch] Symbol: ${symbol} | Price: ₹${quote.regularMarketPrice} | PrevClose: ₹${quote.regularMarketPreviousClose}`);

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

async function getAllStocks() {
  const stocks = await getAllActiveStocks();
  return Promise.all(
    stocks.map(async (stock) => {
      const cached = await getStockData(stock.symbol);
      return {
        ...stock,
        lastPrice: cached?.price ? Number(cached.price) : (stock.lastPrice ? Number(stock.lastPrice) : null),
        high: cached?.high ? Number(cached.high) : (stock.dayHigh ? Number(stock.dayHigh) : null),
        low: cached?.low ? Number(cached.low) : (stock.dayLow ? Number(stock.dayLow) : null),
        open: cached?.open ? Number(cached.open) : (stock.marketOpen ? Number(stock.marketOpen) : null),
        previousClose: cached?.previousClose ? Number(cached.previousClose) : (stock.previousClose ? Number(stock.previousClose) : null),
        updatedAt: cached?.updatedAt || stock.priceUpdatedAt || null,
      };
    })
  );
}

// Helper to format a date to the Asia/Kolkata timezone object representation
function getKolkataDate(date) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

// Simple deterministic pseudo-random number generator based on seed (symbol + step index)
function getDeterministicNoise(symbol, index) {
  let hash = 0;
  const str = symbol + index;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const val = Math.abs(Math.sin(hash) * 1000) % 1;
  return val;
}

async function getStockHistoryService(symbol) {
  try {
    const chartData = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 24 * 60 * 60 * 1000),
      interval: "5m",
    });

    if (chartData && chartData.quotes && chartData.quotes.length > 0) {
      const realPoints = chartData.quotes
        .filter((q) => q.close !== null && q.close !== undefined)
        .map((q) => ({
          price: Number((q.close || q.open || 0).toFixed(2)),
          timestamp: new Date(q.date).toISOString(),
        }));

      if (realPoints.length > 0) {
        console.log(`[Yahoo Finance Chart Fetch] Successfully loaded ${realPoints.length} real points for ${symbol}`);
        return realPoints;
      }
    }
  } catch (chartErr) {
    console.error(`[Yahoo Finance Chart Fetch Failed] Using local database/fallback for ${symbol}:`, chartErr.message);
  }

  let points = [];
  try {
    points = await getStockHistory(symbol);
  } catch (err) {
    console.error(`Failed to get history for ${symbol}:`, err.message);
  }

  // If there is no DB history, backfill it using strict Indian Market Hours (9:15 AM - 3:30 PM IST)
  if (!points || points.length < 30) {
    const now = new Date();
    const istNow = getKolkataDate(now);
    const day = istNow.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = istNow.getHours();
    const minute = istNow.getMinutes();

    let targetDate = new Date(now);
    let isMarketLive = false;

    // 1. Determine the target trading day based on day of week and current IST time
    if (day === 0) { // Sunday -> use preceding Friday
      targetDate.setDate(targetDate.getDate() - 2);
    } else if (day === 6) { // Saturday -> use preceding Friday
      targetDate.setDate(targetDate.getDate() - 1);
    } else {
      // Weekday (Mon - Fri)
      const currentTimeInMinutes = hour * 60 + minute;
      const marketOpenInMinutes = 9 * 60 + 15;
      const marketCloseInMinutes = 15 * 60 + 30;

      if (currentTimeInMinutes < marketOpenInMinutes) {
        // Before market opens, show the preceding market session
        if (day === 1) { // Monday before 9:15 AM -> show Friday
          targetDate.setDate(targetDate.getDate() - 3);
        } else { // Tue - Fri before 9:15 AM -> show yesterday
          targetDate.setDate(targetDate.getDate() - 1);
        }
      } else if (currentTimeInMinutes >= marketOpenInMinutes && currentTimeInMinutes <= marketCloseInMinutes) {
        // During market hours
        isMarketLive = true;
      } else {
        // After market closes -> show the full day today
      }
    }

    // 2. Set start and end boundaries in UTC corresponding to IST market hours
    const targetIst = getKolkataDate(targetDate);
    const targetYear = targetIst.getFullYear();
    const targetMonth = targetIst.getMonth();
    const targetDay = targetIst.getDate();

    // 9:15 AM IST is 3:45 AM UTC
    const marketStartTime = new Date(Date.UTC(targetYear, targetMonth, targetDay, 3, 45, 0));
    
    let marketEndTime;
    if (isMarketLive) {
      // Live market: chart up to the current moment
      marketEndTime = new Date(now);
    } else {
      // Closed: chart up to 3:30 PM IST (10:00 AM UTC)
      marketEndTime = new Date(Date.UTC(targetYear, targetMonth, targetDay, 10, 0, 0));
    }

    // 3. Resolve starting stock price
    let currentPrice = 100;
    try {
      const cached = await getStockData(symbol);
      if (cached?.price) {
        currentPrice = Number(cached.price);
      } else {
        const quote = await getStockPrice(symbol);
        currentPrice = quote.price;
      }
    } catch (err) {
      // Fallback
    }

    // 4. Generate points at 10-minute intervals
    const startMs = marketStartTime.getTime();
    const endMs = marketEndTime.getTime();
    const intervalMs = 10 * 60 * 1000;
    
    let price = currentPrice * 0.95;
    const numSteps = Math.max(30, Math.floor((endMs - startMs) / intervalMs));
    const backfilled = [];


    for (let i = 0; i <= numSteps; i++) {
      const pointTime = new Date(startMs + i * ((endMs - startMs) / numSteps));
      const noise = getDeterministicNoise(symbol, i);
      price = price * (1 + (noise - 0.485) * 0.012);
      backfilled.push({
        price: parseFloat(price.toFixed(2)),
        timestamp: pointTime.toISOString(),
      });
    }

    points = [...backfilled, ...(points || [])];
  }

  return points;
}

module.exports = {
  searchStocks,
  getStockPrice,
  getAllStocks,
  getStockHistory: getStockHistoryService,
};