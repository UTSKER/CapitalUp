const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

const {
  searchStocks: searchStocksRepo,
  getAllActiveStocks,
  findStockBySymbol,
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
      await yahooFinance.quote(symbol, undefined, { validateResult: false });

    if (
      !quote ||
      quote.regularMarketPrice == null
    ) {
      throw new Error(
        `No price data available for ${symbol}`
      );
    }

   // console.log(`[Yahoo Finance API Fetch] Symbol: ${symbol} | Price: ₹${quote.regularMarketPrice} | PrevClose: ₹${quote.regularMarketPreviousClose}`);

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
      updatedAt:
        quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : new Date().toISOString(),
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

// Simple hash function to generate a stable seed for a symbol
function getSymbolSeed(symbol) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seed-based pseudo-random number generator (Mulberry32)
function getSeededRandom(seed) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function getStockHistoryService(symbol) {
  try {
    const chartData = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      interval: "5m",
    });

    if (chartData && chartData.quotes && chartData.quotes.length > 0) {
      // Group quotes by trading date in India (IST)
      const groups = {};
      for (const q of chartData.quotes) {
        if (q.close === null || q.close === undefined) continue;
        
        // Convert to IST offset to group by correct day in India
        const istDate = new Date(new Date(q.date).getTime() + 5.5 * 60 * 60 * 1000);
        const dateStr = istDate.toISOString().split("T")[0];
        
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(q);
      }

      const dates = Object.keys(groups).sort();
      if (dates.length > 0) {
        const latestDate = dates[dates.length - 1];
        const realPoints = groups[latestDate].map((q) => ({
          price: Number((q.close || q.open || 0).toFixed(2)),
          timestamp: new Date(q.date).toISOString(),
        }));

        if (realPoints.length > 0) {
       //   console.log(`[Yahoo Finance Chart Fetch] Successfully loaded ${realPoints.length} real points for ${symbol} on date ${latestDate}`);
          return realPoints;
        }
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

    const bypassMarketHours = process.env.BYPASS_MARKET_HOURS === "true";

    // 1. Determine the target trading day based on day of week and current IST time
    if (day === 0 && !bypassMarketHours) { // Sunday -> use preceding Friday
      targetDate.setDate(targetDate.getDate() - 2);
    } else if (day === 6 && !bypassMarketHours) { // Saturday -> use preceding Friday
      targetDate.setDate(targetDate.getDate() - 1);
    } else {
      // Weekday (Mon - Fri)
      const currentTimeInMinutes = hour * 60 + minute;
      const marketOpenInMinutes = 9 * 60 + 15;
      const marketCloseInMinutes = 15 * 60 + 30;

      if (currentTimeInMinutes < marketOpenInMinutes && !bypassMarketHours) {
        // Before market opens, show the preceding market session
        if (day === 1) { // Monday before 9:15 AM -> show Friday
          targetDate.setDate(targetDate.getDate() - 3);
        } else { // Tue - Fri before 9:15 AM -> show yesterday
          targetDate.setDate(targetDate.getDate() - 1);
        }
      } else if ((currentTimeInMinutes >= marketOpenInMinutes && currentTimeInMinutes <= marketCloseInMinutes) || bypassMarketHours) {
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

    // 3. Resolve starting stock price deterministically
    let basePrice = 100;
    try {
      const cached = await getStockData(symbol);
      if (cached?.previousClose) {
        basePrice = Number(cached.previousClose);
      } else {
        const stockRow = await findStockBySymbol(symbol);
        if (stockRow && stockRow.previousClose) {
          basePrice = Number(stockRow.previousClose);
        } else {
          // Fallback to a deterministic symbol-based price
          let hash = 0;
          for (let i = 0; i < symbol.length; i++) {
            hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
          }
          basePrice = 100 + (Math.abs(hash) % 900);
        }
      }
    } catch (err) {
      // Fallback to deterministic symbol-based price
      let hash = 0;
      for (let i = 0; i < symbol.length; i++) {
        hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
      }
      basePrice = 100 + (Math.abs(hash) % 900);
    }

    // 4. Generate points at 10-minute intervals
    const startMs = marketStartTime.getTime();
    const endMs = marketEndTime.getTime();
    const intervalMs = 10 * 60 * 1000;
    
    let price = basePrice * 0.95;
    const numSteps = Math.max(30, Math.floor((endMs - startMs) / intervalMs));
    const backfilled = [];

    const seed = getSymbolSeed(symbol);
    const random = getSeededRandom(seed);

    for (let i = 0; i <= numSteps; i++) {
      const pointTime = new Date(startMs + i * ((endMs - startMs) / numSteps));
      const noise = random();
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