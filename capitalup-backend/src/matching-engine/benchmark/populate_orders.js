/**
 * populate_orders.js
 * 
 * Generates and inserts realistic fake resting orders across different symbols
 * and multiple price levels into the CapitalUp Order Matching Engine.
 */

const MatchingEngine = require("../engine/MatchingEngine");

const DEFAULT_SYMBOLS_CONFIG = [
    {
        symbol: "RELIANCE.NS",
        basePrice: 2900.00,
        tickSize: 0.05,
        priceSpreadPct: 0.04, // +/- 4%
        levels: 40,
        ordersPerLevel: 5,
        minQty: 5,
        maxQty: 50
    },
    {
        symbol: "TCS.NS",
        basePrice: 3950.00,
        tickSize: 0.05,
        priceSpreadPct: 0.03,
        levels: 30,
        ordersPerLevel: 4,
        minQty: 2,
        maxQty: 30
    },
    {
        symbol: "INFY.NS",
        basePrice: 1550.00,
        tickSize: 0.05,
        priceSpreadPct: 0.03,
        levels: 30,
        ordersPerLevel: 4,
        minQty: 10,
        maxQty: 100
    },
    {
        symbol: "HDFCBANK.NS",
        basePrice: 1680.00,
        tickSize: 0.05,
        priceSpreadPct: 0.03,
        levels: 25,
        ordersPerLevel: 4,
        minQty: 5,
        maxQty: 80
    },
    {
        symbol: "TATAMOTORS.NS",
        basePrice: 980.00,
        tickSize: 0.05,
        priceSpreadPct: 0.03,
        levels: 30,
        ordersPerLevel: 4,
        minQty: 10,
        maxQty: 100
    },
    {
        symbol: "SBIN.NS",
        basePrice: 780.00,
        tickSize: 0.05,
        priceSpreadPct: 0.03,
        levels: 25,
        ordersPerLevel: 4,
        minQty: 10,
        maxQty: 150
    }
];

/**
 * Populates fake resting orders into the matching engine.
 * @param {MatchingEngine} engine - The matching engine instance
 * @param {Array} symbolsConfig - Configuration for each symbol
 * @param {Object} options - Options (e.g. ordersMultiplier)
 * @returns {Object} Statistics about populated orders
 */
function populateRestingOrders(engine, symbolsConfig = DEFAULT_SYMBOLS_CONFIG, options = {}) {
    const multiplier = options.ordersMultiplier || 1;
    let totalOrdersAdded = 0;
    let totalRestingQuantity = 0;
    const statsBySymbol = {};

    const startTime = Date.now();

    for (const cfg of symbolsConfig) {
        let symbolOrdersCount = 0;
        let symbolQuantity = 0;

        // Populate SELL side (Asks above base price)
        for (let level = 1; level <= cfg.levels; level++) {
            const priceStep = (cfg.basePrice * (cfg.priceSpreadPct / cfg.levels)) * level;
            const price = Number((cfg.basePrice + priceStep).toFixed(2));
            const ordersAtThisLevel = cfg.ordersPerLevel * multiplier;

            for (let i = 0; i < ordersAtThisLevel; i++) {
                const qty = Math.floor(Math.random() * (cfg.maxQty - cfg.minQty + 1)) + cfg.minQty;
                const orderId = `fake-ask-${cfg.symbol}-${level}-${i}-${Date.now()}`;
                const userId = `seller-${(i % 100) + 1}`;

                engine.placeOrder({
                    id: orderId,
                    userId: userId,
                    symbol: cfg.symbol,
                    side: "SELL",
                    quantity: qty,
                    limitPrice: price,
                    orderType: "LIMIT",
                    timeInForce: "DAY"
                });

                symbolOrdersCount++;
                symbolQuantity += qty;
            }
        }

        // Populate BUY side (Bids below base price)
        for (let level = 1; level <= cfg.levels; level++) {
            const priceStep = (cfg.basePrice * (cfg.priceSpreadPct / cfg.levels)) * level;
            const price = Number((cfg.basePrice - priceStep).toFixed(2));
            const ordersAtThisLevel = cfg.ordersPerLevel * multiplier;

            for (let i = 0; i < ordersAtThisLevel; i++) {
                const qty = Math.floor(Math.random() * (cfg.maxQty - cfg.minQty + 1)) + cfg.minQty;
                const orderId = `fake-bid-${cfg.symbol}-${level}-${i}-${Date.now()}`;
                const userId = `buyer-${(i % 100) + 1}`;

                engine.placeOrder({
                    id: orderId,
                    userId: userId,
                    symbol: cfg.symbol,
                    side: "BUY",
                    quantity: qty,
                    limitPrice: price,
                    orderType: "LIMIT",
                    timeInForce: "DAY"
                });

                symbolOrdersCount++;
                symbolQuantity += qty;
            }
        }

        totalOrdersAdded += symbolOrdersCount;
        totalRestingQuantity += symbolQuantity;

        const book = engine.getOrderBook(cfg.symbol);
        statsBySymbol[cfg.symbol] = {
            ordersAdded: symbolOrdersCount,
            totalQuantity: symbolQuantity,
            bestBid: book.bestBid() ? book.bestBid().price : null,
            bestAsk: book.bestAsk() ? book.bestAsk().price : null,
            totalActiveOrders: book.orderCount()
        };
    }

    const durationMs = Math.max(1, Date.now() - startTime);

    return {
        totalOrdersAdded,
        totalRestingQuantity,
        durationMs,
        ratePerSec: Math.round((totalOrdersAdded / durationMs) * 1000),
        statsBySymbol
    };
}

// Standalone execution support
if (require.main === module) {
    console.log("==========================================================");
    console.log("  CAPITALUP MATCHING ENGINE: FAKE ORDER POPULATOR");
    console.log("==========================================================");

    const engine = new MatchingEngine();
    const result = populateRestingOrders(engine);

    console.log(`\nSuccessfully populated ${result.totalOrdersAdded} resting orders in ${result.durationMs}ms`);
    console.log(`Ingestion rate: ${result.ratePerSec.toLocaleString()} orders/sec\n`);

    console.table(Object.entries(result.statsBySymbol).map(([symbol, stat]) => ({
        Symbol: symbol,
        "Orders Loaded": stat.ordersAdded,
        "Total Shares": stat.totalQuantity,
        "Best Bid (₹)": stat.bestBid,
        "Best Ask (₹)": stat.bestAsk,
        "Spread (₹)": (stat.bestAsk - stat.bestBid).toFixed(2),
        "Active in Book": stat.totalActiveOrders
    })));
}

module.exports = {
    populateRestingOrders,
    DEFAULT_SYMBOLS_CONFIG
};
