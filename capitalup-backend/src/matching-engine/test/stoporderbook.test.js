const assert = require("assert");
const MatchingEngine = require("../engine/MatchingEngine");

const engine = new MatchingEngine();
const createdAt = Date.now();

// Unknown symbol → no trades
assert.deepStrictEqual(
    engine.processMarketPriceForStops("INFY.NS", 1000),
    []
);

// ---------- BUY STOP: triggers when currentPrice >= stopPrice ----------

engine.placeStopOrder({
    id: "buy-stop-1",
    userId: "user-a",
    symbol: "TCS.NS",
    side: "BUY",
    quantity: 10,
    stopPrice: 3900,
    validity: "DAY",
    createdAt,
});

engine.placeStopOrder({
    id: "buy-stop-2",
    userId: "user-b",
    symbol: "TCS.NS",
    side: "BUY",
    quantity: 20,
    stopPrice: 3950,
    validity: "DAY",
    createdAt: createdAt + 1,
});

// Price below both stop prices → nothing triggers
assert.deepStrictEqual(
    engine.processMarketPriceForStops("TCS.NS", 3800),
    []
);

// Price crosses only the 3900 stop
let trades = engine.processMarketPriceForStops("TCS.NS", 3925);
assert.strictEqual(trades.length, 1);
assert.strictEqual(trades[0].orderId, "buy-stop-1");
assert.strictEqual(trades[0].executedPrice, 3925); // fills at market, not stop price
assert.strictEqual(trades[0].executedQuantity, 10);

// Price crosses the 3950 stop
trades = engine.processMarketPriceForStops("TCS.NS", 4000);
assert.strictEqual(trades.length, 1);
assert.strictEqual(trades[0].orderId, "buy-stop-2");
assert.strictEqual(trades[0].executedPrice, 4000);

// Book drained
assert.deepStrictEqual(
    engine.processMarketPriceForStops("TCS.NS", 5000),
    []
);

// ---------- SELL STOP: triggers when currentPrice <= stopPrice ----------

engine.placeStopOrder({
    id: "sell-stop-1",
    userId: "user-c",
    symbol: "TCS.NS",
    side: "SELL",
    quantity: 5,
    stopPrice: 3300,
    validity: "GTT",
    createdAt: createdAt + 2,
});

engine.placeStopOrder({
    id: "sell-stop-2",
    userId: "user-d",
    symbol: "TCS.NS",
    side: "SELL",
    quantity: 8,
    stopPrice: 3200,
    validity: "GTT",
    createdAt: createdAt + 3,
});

// Price above both stop prices → nothing triggers
assert.deepStrictEqual(
    engine.processMarketPriceForStops("TCS.NS", 3400),
    []
);

// Price falls through only the 3300 stop
trades = engine.processMarketPriceForStops("TCS.NS", 3250);
assert.strictEqual(trades.length, 1);
assert.strictEqual(trades[0].orderId, "sell-stop-1");
assert.strictEqual(trades[0].executedPrice, 3250);

// Price falls through the 3200 stop
trades = engine.processMarketPriceForStops("TCS.NS", 3100);
assert.strictEqual(trades.length, 1);
assert.strictEqual(trades[0].orderId, "sell-stop-2");
assert.strictEqual(trades[0].executedPrice, 3100);

// ---------- FIFO within one stop price level ----------

engine.placeStopOrder({
    id: "sell-stop-3",
    userId: "user-e",
    symbol: "TCS.NS",
    side: "SELL",
    quantity: 3,
    stopPrice: 3000,
    validity: "DAY",
    createdAt: createdAt + 4,
});

engine.placeStopOrder({
    id: "sell-stop-4",
    userId: "user-f",
    symbol: "TCS.NS",
    side: "SELL",
    quantity: 4,
    stopPrice: 3000,
    validity: "DAY",
    createdAt: createdAt + 5,
});

trades = engine.processMarketPriceForStops("TCS.NS", 2900);
assert.strictEqual(trades.length, 2);
assert.strictEqual(trades[0].orderId, "sell-stop-3");
assert.strictEqual(trades[1].orderId, "sell-stop-4");

// ---------- Cancel removes from the book ----------

engine.placeStopOrder({
    id: "buy-stop-3",
    userId: "user-g",
    symbol: "TCS.NS",
    side: "BUY",
    quantity: 2,
    stopPrice: 3500,
    validity: "DAY",
    createdAt: createdAt + 6,
});

assert.ok(engine.getStopOrder("TCS.NS", "buy-stop-3"));
assert.strictEqual(engine.cancelStopOrder("TCS.NS", "buy-stop-3"), true);
assert.strictEqual(engine.getStopOrder("TCS.NS", "buy-stop-3"), null);
assert.strictEqual(engine.cancelStopOrder("TCS.NS", "buy-stop-3"), false);
assert.deepStrictEqual(
    engine.processMarketPriceForStops("TCS.NS", 4000),
    []
);

// ---------- Limit book and stop book are independent ----------

engine.placeOrder({
    id: "limit-buy-1",
    userId: "user-h",
    symbol: "TCS.NS",
    side: "BUY",
    quantity: 6,
    limitPrice: 3600,
    validity: "DAY",
    createdAt: createdAt + 7,
});

engine.placeStopOrder({
    id: "buy-stop-4",
    userId: "user-h",
    symbol: "TCS.NS",
    side: "BUY",
    quantity: 6,
    stopPrice: 3700,
    validity: "DAY",
    createdAt: createdAt + 8,
});

// A tick at 3600: limit buy (limitPrice >= price) fills; buy stop (3700 > price) must not
trades = engine.processMarketPrice("TCS.NS", 3600);
assert.strictEqual(trades.length, 1);
assert.strictEqual(trades[0].orderId, "limit-buy-1");
assert.ok(engine.getStopOrder("TCS.NS", "buy-stop-4"));

// Stop processing does not touch the (now empty) limit book
trades = engine.processMarketPriceForStops("TCS.NS", 3700);
assert.strictEqual(trades.length, 1);
assert.strictEqual(trades[0].orderId, "buy-stop-4");
assert.strictEqual(engine.getOrder("TCS.NS", "buy-stop-4"), null);

console.log("All StopOrderBook tests passed");
