const assert = require("assert");
const MatchingEngine = require("../engine/MatchingEngine");

const engine = new MatchingEngine();
const createdAt = Date.now();

assert.deepStrictEqual(
    engine.processMarketPrice("INFY.NS", 1000),
    []
);

engine.placeOrder({
    id: "buy-1",
    userId: "user-a",
    symbol: "TCS.NS",
    side: "BUY",
    quantity: 10,
    limitPrice: 3900,
    validity: "DAY",
    createdAt,
});

engine.placeOrder({
    id: "buy-2",
    userId: "user-b",
    symbol: "TCS.NS",
    side: "BUY",
    quantity: 20,
    limitPrice: 3900,
    validity: "DAY",
    createdAt: createdAt + 1,
});

engine.placeOrder({
    id: "buy-3",
    userId: "user-c",
    symbol: "TCS.NS",
    side: "BUY",
    quantity: 5,
    limitPrice: 4000,
    validity: "DAY",
    createdAt: createdAt + 2,
});

engine.placeOrder({
    id: "sell-1",
    userId: "user-d",
    symbol: "TCS.NS",
    side: "SELL",
    quantity: 7,
    limitPrice: 4100,
    validity: "DAY",
    createdAt: createdAt + 3,
});

engine.placeOrder({
    id: "sell-2",
    userId: "user-e",
    symbol: "TCS.NS",
    side: "SELL",
    quantity: 8,
    limitPrice: 4050,
    validity: "DAY",
    createdAt: createdAt + 4,
});

let trades =
    engine.processMarketPrice("TCS.NS", 3950);

assert.deepStrictEqual(
    trades.map((trade) => trade.orderId),
    ["buy-3"]
);
assert.strictEqual(trades[0].userId, "user-c");
assert.strictEqual(trades[0].symbol, "TCS.NS");
assert.strictEqual(trades[0].executedPrice, 3950);
assert.strictEqual(trades[0].executedQuantity, 5);

const book = engine.orderBooks.get("TCS.NS");

assert.strictEqual(book.bestBid().price, 3900);
assert.strictEqual(book.bestAsk().price, 4050);

trades =
    engine.processMarketPrice("TCS.NS", 3900);

assert.deepStrictEqual(
    trades.map((trade) => trade.orderId),
    ["buy-1", "buy-2"]
);
assert.strictEqual(book.bestBid(), null);

trades =
    engine.processMarketPrice("TCS.NS", 4050);

assert.deepStrictEqual(
    trades.map((trade) => trade.orderId),
    ["sell-2"]
);
assert.strictEqual(book.bestAsk().price, 4100);

trades =
    engine.processMarketPrice("TCS.NS", 4200);

assert.deepStrictEqual(
    trades.map((trade) => trade.orderId),
    ["sell-1"]
);
assert.strictEqual(book.orderCount(), 0);

console.log("Broker matching-engine tests passed");
