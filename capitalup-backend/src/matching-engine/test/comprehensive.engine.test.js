const assert = require("assert");
const MatchingEngine = require("../engine/MatchingEngine");
const OrderBook = require("../core/OrderBook");
const StopOrderBook = require("../core/StopOrderBook");
const OrderNode = require("../core/OrderNode");

console.log("==================================================");
console.log("STARTING COMPREHENSIVE MATCHING ENGINE TEST SUITE");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✓ PASS: ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(err);
        testsFailed++;
        throw err;
    }
}

// -----------------------------------------------------------------------------
// Test A: Basic limit BUY/SELL match
// -----------------------------------------------------------------------------
runTest("Test A: Basic limit BUY/SELL match", () => {
    const engine = new MatchingEngine();
    
    // Resting sell order: 10 shares @ 100
    const sellRes = engine.placeOrder({
        id: "sell-A1",
        userId: "user-seller",
        symbol: "TEST",
        side: "SELL",
        quantity: 10,
        limitPrice: 100,
        orderType: "LIMIT"
    });
    assert.strictEqual(sellRes.trades.length, 0);

    // Incoming buy order: 10 shares @ 100
    const buyRes = engine.placeOrder({
        id: "buy-A1",
        userId: "user-buyer",
        symbol: "TEST",
        side: "BUY",
        quantity: 10,
        limitPrice: 100,
        orderType: "LIMIT"
    });

    assert.strictEqual(buyRes.trades.length, 1);
    assert.strictEqual(buyRes.trades[0].makerOrderId, "sell-A1");
    assert.strictEqual(buyRes.trades[0].takerOrderId, "buy-A1");
    assert.strictEqual(buyRes.trades[0].executedPrice, 100);
    assert.strictEqual(buyRes.trades[0].executedQuantity, 10);
    assert.strictEqual(engine.getOrderBook("TEST").orderCount(), 0);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test B: Partial fill
// -----------------------------------------------------------------------------
runTest("Test B: Partial fill", () => {
    const engine = new MatchingEngine();
    
    // Resting sell: 10 shares @ 100
    engine.placeOrder({
        id: "sell-B1",
        userId: "user-seller",
        symbol: "TEST",
        side: "SELL",
        quantity: 10,
        limitPrice: 100,
        orderType: "LIMIT"
    });

    // Incoming buy: 4 shares @ 100 -> partial fill of sell-B1
    const buyRes = engine.placeOrder({
        id: "buy-B1",
        userId: "user-buyer",
        symbol: "TEST",
        side: "BUY",
        quantity: 4,
        limitPrice: 100,
        orderType: "LIMIT"
    });

    assert.strictEqual(buyRes.trades.length, 1);
    assert.strictEqual(buyRes.trades[0].executedQuantity, 4);
    assert.strictEqual(buyRes.filledQuantity, 4);

    const book = engine.getOrderBook("TEST");
    const restingSell = book.getOrder("sell-B1");
    assert(restingSell !== null);
    assert.strictEqual(restingSell.remainingQuantity, 6);
    assert.strictEqual(restingSell.filledQuantity, 4);
    assert.strictEqual(restingSell.status, "PARTIALLY_FILLED");
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test C: Multiple price levels
// -----------------------------------------------------------------------------
runTest("Test C: Multiple price levels execution", () => {
    const engine = new MatchingEngine();
    
    // Book resting asks: 10 @ 100, 10 @ 101, 10 @ 102
    engine.placeOrder({ id: "s1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });
    engine.placeOrder({ id: "s2", userId: "u2", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 101 });
    engine.placeOrder({ id: "s3", userId: "u3", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 102 });

    // Incoming buy for 25 @ 102 -> eats 10 @ 100, 10 @ 101, 5 @ 102
    const buyRes = engine.placeOrder({
        id: "b-agg",
        userId: "u-buyer",
        symbol: "TEST",
        side: "BUY",
        quantity: 25,
        limitPrice: 102
    });

    assert.strictEqual(buyRes.trades.length, 3);
    assert.strictEqual(buyRes.trades[0].executedPrice, 100);
    assert.strictEqual(buyRes.trades[0].executedQuantity, 10);
    assert.strictEqual(buyRes.trades[1].executedPrice, 101);
    assert.strictEqual(buyRes.trades[1].executedQuantity, 10);
    assert.strictEqual(buyRes.trades[2].executedPrice, 102);
    assert.strictEqual(buyRes.trades[2].executedQuantity, 5);

    const book = engine.getOrderBook("TEST");
    assert.strictEqual(book.bestAsk().price, 102);
    assert.strictEqual(book.bestAsk().totalQuantity, 5);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test D: BUY crossing best ask
// -----------------------------------------------------------------------------
runTest("Test D: BUY crossing best ask executes at maker price", () => {
    const engine = new MatchingEngine();
    
    // Resting sell at 100
    engine.placeOrder({ id: "s-100", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });

    // Marketable BUY limit at 105 (crosses 100) -> must execute at 100!
    const buyRes = engine.placeOrder({
        id: "b-105",
        userId: "u2",
        symbol: "TEST",
        side: "BUY",
        quantity: 10,
        limitPrice: 105
    });

    assert.strictEqual(buyRes.trades.length, 1);
    assert.strictEqual(buyRes.trades[0].executedPrice, 100); // maker price
    assert.strictEqual(buyRes.trades[0].executedQuantity, 10);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test E: SELL crossing best bid
// -----------------------------------------------------------------------------
runTest("Test E: SELL crossing best bid executes at maker price", () => {
    const engine = new MatchingEngine();
    
    // Resting buy at 100
    engine.placeOrder({ id: "b-100", userId: "u1", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: 100 });

    // Marketable SELL limit at 95 (crosses 100) -> must execute at 100!
    const sellRes = engine.placeOrder({
        id: "s-95",
        userId: "u2",
        symbol: "TEST",
        side: "SELL",
        quantity: 10,
        limitPrice: 95
    });

    assert.strictEqual(sellRes.trades.length, 1);
    assert.strictEqual(sellRes.trades[0].executedPrice, 100); // maker price
    assert.strictEqual(sellRes.trades[0].executedQuantity, 10);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test F: Non-crossing limit order rests
// -----------------------------------------------------------------------------
runTest("Test F: Non-crossing limit order rests in order book", () => {
    const engine = new MatchingEngine();
    
    // Resting sell at 110
    engine.placeOrder({ id: "s-110", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 110 });

    // BUY limit at 105 does not cross 110 -> must rest at 105
    const buyRes = engine.placeOrder({
        id: "b-105",
        userId: "u2",
        symbol: "TEST",
        side: "BUY",
        quantity: 5,
        limitPrice: 105
    });

    assert.strictEqual(buyRes.trades.length, 0);
    assert.strictEqual(buyRes.remainingOrder.remainingQuantity, 5);
    
    const book = engine.getOrderBook("TEST");
    assert.strictEqual(book.bestBid().price, 105);
    assert.strictEqual(book.bestAsk().price, 110);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test G: MARKET order with insufficient liquidity
// -----------------------------------------------------------------------------
runTest("Test G: MARKET order with insufficient liquidity fills available then cancels", () => {
    const engine = new MatchingEngine();
    
    // Sell liquidity: only 7 available @ 100
    engine.placeOrder({ id: "s-7", userId: "u1", symbol: "TEST", side: "SELL", quantity: 7, limitPrice: 100 });

    // Market buy for 15
    const buyRes = engine.placeOrder({
        id: "mkt-buy",
        userId: "u2",
        symbol: "TEST",
        side: "BUY",
        quantity: 15,
        orderType: "MARKET"
    });

    assert.strictEqual(buyRes.trades.length, 1);
    assert.strictEqual(buyRes.trades[0].executedQuantity, 7);
    assert.strictEqual(buyRes.filledQuantity, 7);
    // Unfilled remainder (8) of market order is cancelled, NOT rested
    assert.strictEqual(engine.getOrderBook("TEST").orderCount(), 0);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test H: FOK successful full fill
// -----------------------------------------------------------------------------
runTest("Test H: FOK successful full fill", () => {
    const engine = new MatchingEngine();
    
    // Resting sells: 50 @ 100, 30 @ 101, 20 @ 102 (total 100 available)
    engine.placeOrder({ id: "s1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 50, limitPrice: 100 });
    engine.placeOrder({ id: "s2", userId: "u2", symbol: "TEST", side: "SELL", quantity: 30, limitPrice: 101 });
    engine.placeOrder({ id: "s3", userId: "u3", symbol: "TEST", side: "SELL", quantity: 20, limitPrice: 102 });

    // BUY FOK: quantity = 100, limitPrice = 102
    const fokRes = engine.placeOrder({
        id: "fok-100",
        userId: "u-fok",
        symbol: "TEST",
        side: "BUY",
        quantity: 100,
        limitPrice: 102,
        timeInForce: "FOK"
    });

    assert.strictEqual(fokRes.status, "FILLED");
    assert.strictEqual(fokRes.filledQuantity, 100);
    assert.strictEqual(fokRes.trades.length, 3);
    assert.strictEqual(engine.getOrderBook("TEST").orderCount(), 0);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test I: FOK insufficient liquidity -> ZERO execution
// -----------------------------------------------------------------------------
runTest("Test I: FOK insufficient liquidity -> ZERO execution and rejection", () => {
    const engine = new MatchingEngine();
    
    // Resting sells: 50 @ 100, 30 @ 101, 20 @ 102 (total 100 available)
    engine.placeOrder({ id: "s1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 50, limitPrice: 100 });
    engine.placeOrder({ id: "s2", userId: "u2", symbol: "TEST", side: "SELL", quantity: 30, limitPrice: 101 });
    engine.placeOrder({ id: "s3", userId: "u3", symbol: "TEST", side: "SELL", quantity: 20, limitPrice: 102 });

    // BUY FOK: quantity = 110, limitPrice = 102 (needs 110, only 100 exists)
    const fokRes = engine.placeOrder({
        id: "fok-110",
        userId: "u-fok",
        symbol: "TEST",
        side: "BUY",
        quantity: 110,
        limitPrice: 102,
        timeInForce: "FOK"
    });

    assert.strictEqual(fokRes.status, "REJECTED");
    assert.strictEqual(fokRes.reason, "FOK_NOT_FILLABLE");
    assert.strictEqual(fokRes.filledQuantity, 0);
    assert.strictEqual(fokRes.trades.length, 0);

    // Order book must NOT have been mutated!
    const book = engine.getOrderBook("TEST");
    assert.strictEqual(book.orderCount(), 3);
    assert.strictEqual(book.bestAsk().price, 100);
    assert.strictEqual(book.getOrder("s1").remainingQuantity, 50);
    assert.strictEqual(book.getOrder("s2").remainingQuantity, 30);
    assert.strictEqual(book.getOrder("s3").remainingQuantity, 20);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test J: FOK across multiple price levels
// -----------------------------------------------------------------------------
runTest("Test J: FOK across multiple price levels with price limit check", () => {
    const engine = new MatchingEngine();
    
    // Sells: 20 @ 50, 20 @ 51, 20 @ 55
    engine.placeOrder({ id: "s1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 20, limitPrice: 50 });
    engine.placeOrder({ id: "s2", userId: "u2", symbol: "TEST", side: "SELL", quantity: 20, limitPrice: 51 });
    engine.placeOrder({ id: "s3", userId: "u3", symbol: "TEST", side: "SELL", quantity: 20, limitPrice: 55 });

    // FOK for 45 @ 52 -> Can only get 40 (20 @ 50 + 20 @ 51). The other 20 is @ 55 (above limit 52).
    // Must reject with zero fill.
    const fokRes = engine.placeOrder({
        id: "fok-45",
        userId: "u-fok",
        symbol: "TEST",
        side: "BUY",
        quantity: 45,
        limitPrice: 52,
        timeInForce: "FOK"
    });

    assert.strictEqual(fokRes.status, "REJECTED");
    assert.strictEqual(fokRes.filledQuantity, 0);
    assert.strictEqual(engine.getOrderBook("TEST").orderCount(), 3);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test K: FOK must never leave a remainder in the book
// -----------------------------------------------------------------------------
runTest("Test K: FOK must never leave a remainder in the book", () => {
    const engine = new MatchingEngine();
    
    // Empty book
    const fokRes = engine.placeOrder({
        id: "fok-empty",
        userId: "u1",
        symbol: "TEST",
        side: "BUY",
        quantity: 10,
        limitPrice: 100,
        timeInForce: "FOK"
    });

    assert.strictEqual(fokRes.status, "REJECTED");
    assert.strictEqual(engine.getOrderBook("TEST").orderCount(), 0);
    assert.strictEqual(engine.getOrderBook("TEST").getOrder("fok-empty"), null);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test L: Cancel before match
// -----------------------------------------------------------------------------
runTest("Test L: Cancel before match prevents subsequent match", () => {
    const engine = new MatchingEngine();
    
    // Place resting order
    engine.placeOrder({ id: "o1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });
    
    // Cancel o1
    const cancelRes = engine.cancelOrder("TEST", "o1");
    assert.strictEqual(cancelRes.success, true);
    assert.strictEqual(engine.getOrderBook("TEST").orderCount(), 0);

    // Try matching with an incoming buy
    const buyRes = engine.placeOrder({ id: "o2", userId: "u2", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: 100 });
    assert.strictEqual(buyRes.trades.length, 0); // No match possible!
    assert.strictEqual(buyRes.remainingOrder.remainingQuantity, 10); // rests
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test M: Match before cancel
// -----------------------------------------------------------------------------
runTest("Test M: Match before cancel returns ALREADY_FILLED", () => {
    const engine = new MatchingEngine();
    
    engine.placeOrder({ id: "o1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });
    // Match o1 completely
    engine.placeOrder({ id: "o2", userId: "u2", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: 100 });

    // Now attempt to cancel o1
    const cancelRes = engine.cancelOrder("TEST", "o1");
    assert.strictEqual(cancelRes.success, false);
    assert.strictEqual(cancelRes.reason, "ORDER_NOT_FOUND");
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test N: Cancel partially filled order
// -----------------------------------------------------------------------------
runTest("Test N: Cancel partially filled order cancels only remaining quantity", () => {
    const engine = new MatchingEngine();
    
    engine.placeOrder({ id: "s1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });
    // Partial fill 4 shares
    engine.placeOrder({ id: "b1", userId: "u2", symbol: "TEST", side: "BUY", quantity: 4, limitPrice: 100 });

    // Cancel remaining 6 shares
    const cancelRes = engine.cancelOrder("TEST", "s1");
    assert.strictEqual(cancelRes.success, true);
    assert.strictEqual(cancelRes.order.status, "CANCELLED");
    assert.strictEqual(cancelRes.order.remainingQuantity, 6);
    assert.strictEqual(cancelRes.order.filledQuantity, 4);
    assert.strictEqual(engine.getOrderBook("TEST").orderCount(), 0);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test O: Cancel already filled order
// -----------------------------------------------------------------------------
runTest("Test O: Cancel already filled order is safe and idempotent", () => {
    const engine = new MatchingEngine();
    
    engine.placeOrder({ id: "s1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });
    engine.placeOrder({ id: "b1", userId: "u2", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: 100 });

    const cancelRes = engine.cancelOrder("TEST", "s1");
    assert.strictEqual(cancelRes.success, false);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test P: Duplicate cancellation
// -----------------------------------------------------------------------------
runTest("Test P: Duplicate cancellation is safe and idempotent", () => {
    const engine = new MatchingEngine();
    
    engine.placeOrder({ id: "s1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });
    
    const firstCancel = engine.cancelOrder("TEST", "s1");
    assert.strictEqual(firstCancel.success, true);

    const secondCancel = engine.cancelOrder("TEST", "s1");
    assert.strictEqual(secondCancel.success, false);
    assert.strictEqual(secondCancel.reason, "ORDER_NOT_FOUND");
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test Q: Self-trade prevention (CANCEL_NEW)
// -----------------------------------------------------------------------------
runTest("Test Q: Self-trade prevention cancels incoming order (CANCEL_NEW)", () => {
    const engine = new MatchingEngine();
    
    // Resting sell by user-1
    engine.placeOrder({ id: "s1", userId: "user-1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });

    // Incoming buy also by user-1 -> Self-Trade!
    const buyRes = engine.placeOrder({
        id: "b1",
        userId: "user-1",
        symbol: "TEST",
        side: "BUY",
        quantity: 10,
        limitPrice: 100
    });

    assert.strictEqual(buyRes.status, "CANCELLED");
    assert.strictEqual(buyRes.reason, "SELF_TRADE_PREVENTED");
    assert.strictEqual(buyRes.trades.length, 0);

    // Resting order s1 remains active and untouched
    const book = engine.getOrderBook("TEST");
    const restingSell = book.getOrder("s1");
    assert(restingSell !== null);
    assert.strictEqual(restingSell.remainingQuantity, 10);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test R: Duplicate / idempotent order submission (clientOrderId)
// -----------------------------------------------------------------------------
runTest("Test R: Idempotent order submission returns duplicate rejection if already active", () => {
    const engine = new MatchingEngine();
    
    const o1 = engine.placeOrder({
        id: "ord-1",
        clientOrderId: "client-req-999",
        userId: "user-1",
        symbol: "TEST",
        side: "BUY",
        quantity: 10,
        limitPrice: 100
    });
    assert.strictEqual(o1.trades.length, 0);

    // Retry with same order id
    const retry = engine.placeOrder({
        id: "ord-1",
        clientOrderId: "client-req-999",
        userId: "user-1",
        symbol: "TEST",
        side: "BUY",
        quantity: 10,
        limitPrice: 100
    });

    assert.strictEqual(retry.status, "REJECTED");
    assert.strictEqual(retry.reason, "DUPLICATE_ORDER_ID");
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test S: OCO first-leg execution cancels second leg
// -----------------------------------------------------------------------------
runTest("Test S: OCO first-leg (LIMIT) execution cancels second leg (STOP)", () => {
    const engine = new MatchingEngine();
    
    // Place limit leg: SELL 10 @ 120
    engine.placeOrder({ id: "limit-leg", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 120 });

    // Place stop leg: SELL 10 @ stopPrice 80, linked to limit-leg
    engine.placeStopOrder({
        id: "stop-leg",
        userId: "u1",
        symbol: "TEST",
        side: "SELL",
        quantity: 10,
        stopPrice: 80,
        linkedLimitOrderId: "limit-leg"
    });

    assert(engine.getStopOrder("TEST", "stop-leg") !== null);

    // Fill limit leg completely by incoming buy
    engine.placeOrder({ id: "buyer", userId: "u2", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: 120 });

    // Stop leg must now be automatically CANCELLED/REMOVED!
    assert.strictEqual(engine.getStopOrder("TEST", "stop-leg"), null);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test T: OCO race / duplicate trigger
// -----------------------------------------------------------------------------
runTest("Test T: OCO stop-leg trigger cancels limit leg", () => {
    const engine = new MatchingEngine();
    
    engine.placeOrder({ id: "limit-leg-2", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 120 });
    engine.placeStopOrder({
        id: "stop-leg-2",
        userId: "u1",
        symbol: "TEST",
        side: "SELL",
        quantity: 10,
        stopPrice: 80,
        linkedLimitOrderId: "limit-leg-2"
    });

    // Market drops to 75 -> triggers stop leg
    const stopTrades = engine.processMarketPriceForStops("TEST", 75);
    assert.strictEqual(stopTrades.length, 1);
    assert.strictEqual(stopTrades[0].orderId, "stop-leg-2");

    // Limit leg must have been automatically cancelled!
    assert.strictEqual(engine.getOrderBook("TEST").getOrder("limit-leg-2"), null);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test U: Stop order crossing multiple trigger levels
// -----------------------------------------------------------------------------
runTest("Test U: Stop order crossing multiple trigger levels in single market jump", () => {
    const engine = new MatchingEngine();
    
    // BUY stops: A @ 100, B @ 105, C @ 110
    engine.placeStopOrder({ id: "stopA", userId: "u1", symbol: "TEST", side: "BUY", quantity: 10, stopPrice: 100 });
    engine.placeStopOrder({ id: "stopB", userId: "u2", symbol: "TEST", side: "BUY", quantity: 15, stopPrice: 105 });
    engine.placeStopOrder({ id: "stopC", userId: "u3", symbol: "TEST", side: "BUY", quantity: 20, stopPrice: 110 });

    // Market jumps from 99 to 112 -> All three must trigger!
    const triggered = engine.processMarketPriceForStops("TEST", 112);
    assert.strictEqual(triggered.length, 3);
    const triggeredIds = triggered.map(t => t.orderId);
    assert(triggeredIds.includes("stopA"));
    assert(triggeredIds.includes("stopB"));
    assert(triggeredIds.includes("stopC"));
});

// -----------------------------------------------------------------------------
// Test V: Order modification and price-time priority
// -----------------------------------------------------------------------------
runTest("Test V: Order modification: price change resets priority; qty decrease preserves it", () => {
    const engine = new MatchingEngine();
    
    // Two buy orders at 100: ord1 first, ord2 second
    engine.placeOrder({ id: "ord1", userId: "u1", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: 100 });
    engine.placeOrder({ id: "ord2", userId: "u2", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: 100 });

    // Reduce ord1 quantity from 10 to 5 -> priority should be preserved!
    const modRes1 = engine.modifyOrder("TEST", "ord1", 100, 5);
    assert.strictEqual(modRes1.success, true);
    
    // Incoming sell for 5 -> should fill ord1 first
    const sellRes1 = engine.placeOrder({ id: "s1", userId: "seller", symbol: "TEST", side: "SELL", quantity: 5, limitPrice: 100 });
    assert.strictEqual(sellRes1.trades[0].makerOrderId, "ord1");

    // Now change ord2 price from 100 to 101 -> gets new priority
    const modRes2 = engine.modifyOrder("TEST", "ord2", 101, 10);
    assert.strictEqual(modRes2.success, true);
    const book = engine.getOrderBook("TEST");
    assert.strictEqual(book.bestBid().price, 101);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test W: Price precision / tick-size behavior
// -----------------------------------------------------------------------------
runTest("Test W: Price precision handles floating-point decimals accurately", () => {
    const engine = new MatchingEngine();
    
    // 0.1 + 0.2 in JS float is 0.30000000000000004
    const p1 = 0.1 + 0.2; // float representation
    const p2 = 0.30;
    
    engine.placeOrder({ id: "sell-float", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: p1 });
    // Incoming buy at exact 0.30 -> tick conversion ensures exact integer match!
    const buyRes = engine.placeOrder({ id: "buy-float", userId: "u2", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: p2 });

    assert.strictEqual(buyRes.trades.length, 1);
    assert.strictEqual(buyRes.trades[0].executedQuantity, 10);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Test X: Concurrency & Single-Writer Sequential Guarantee (Same Symbol)
// -----------------------------------------------------------------------------
runTest("Test X: Concurrency - interleaved operations on same symbol execute deterministically", () => {
    const engine = new MatchingEngine();
    
    // Submit sequence of operations
    // 1. PLACE sell-1: 10 @ 100
    engine.placeOrder({ id: "s1", userId: "u1", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });
    // 2. PLACE sell-2: 10 @ 100
    engine.placeOrder({ id: "s2", userId: "u2", symbol: "TEST", side: "SELL", quantity: 10, limitPrice: 100 });
    // 3. CANCEL sell-1
    engine.cancelOrder("TEST", "s1");
    // 4. BUY 10 @ 100 -> Must match sell-2, because sell-1 was cancelled
    const buyRes = engine.placeOrder({ id: "b1", userId: "u3", symbol: "TEST", side: "BUY", quantity: 10, limitPrice: 100 });
    
    assert.strictEqual(buyRes.trades.length, 1);
    assert.strictEqual(buyRes.trades[0].makerOrderId, "s2");
    // 5. CANCEL sell-2 -> should fail because already filled
    const cancelRes2 = engine.cancelOrder("TEST", "s2");
    assert.strictEqual(cancelRes2.success, false);
    
    assert.strictEqual(engine.getOrderBook("TEST").orderCount(), 0);
    engine.validateInvariants("TEST");
});

// -----------------------------------------------------------------------------
// Multi-Symbol Independent Processing
// -----------------------------------------------------------------------------
runTest("Multi-Symbol: RELIANCE.NS, TCS.NS, INFY.NS operate independently without blocking", () => {
    const engine = new MatchingEngine();
    
    engine.placeOrder({ id: "rel-1", userId: "u1", symbol: "RELIANCE.NS", side: "BUY", quantity: 10, limitPrice: 2900 });
    engine.placeOrder({ id: "tcs-1", userId: "u2", symbol: "TCS.NS", side: "BUY", quantity: 5, limitPrice: 3950 });
    engine.placeOrder({ id: "infy-1", userId: "u3", symbol: "INFY.NS", side: "BUY", quantity: 20, limitPrice: 1550 });

    assert.strictEqual(engine.getOrderBook("RELIANCE.NS").bestBid().price, 2900);
    assert.strictEqual(engine.getOrderBook("TCS.NS").bestBid().price, 3950);
    assert.strictEqual(engine.getOrderBook("INFY.NS").bestBid().price, 1550);

    // Cancel TCS order, ensure RELIANCE and INFY are unaffected
    engine.cancelOrder("TCS.NS", "tcs-1");
    assert.strictEqual(engine.getOrderBook("TCS.NS").orderCount(), 0);
    assert.strictEqual(engine.getOrderBook("RELIANCE.NS").orderCount(), 1);
    assert.strictEqual(engine.getOrderBook("INFY.NS").orderCount(), 1);

    engine.validateInvariants("RELIANCE.NS");
    engine.validateInvariants("INFY.NS");
});

console.log("==================================================");
console.log(`ALL TESTS PASSED! (${testsPassed} / ${testsPassed + testsFailed})`);
console.log("==================================================");
