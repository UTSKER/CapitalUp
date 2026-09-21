/**
 * matchingEngine.correctness.test.js
 * 
 * Comprehensive Core Matching Engine Correctness Tests for the EXISTING CapitalUp Engine:
 * - BUY vs SELL (Exact, Partial, Multi-Level, No Fill)
 * - Same-Price FIFO Priority across sizes (MICRO, SMALL, MEDIUM, LARGE)
 * - Market Order multi-level liquidity sweeping & empty book handling
 * - Cancel vs Match race condition deterministic sequence ordering
 * - Order Modification priority preservation / reset
 * - Multi-level Stop Order jumps
 * - Atomic OCO Leg Cancellation
 * - Self-Trade Prevention (CANCEL_NEW)
 * - Order Book Invariant Integrity Assertion after every scenario
 */

const assert = require("assert");
const MatchingEngine = require("../../engine/MatchingEngine");
const { NSE_EQUITY_UNIVERSE, FakeMarketClock, ORDER_SIZE_PROFILES } = require("./syntheticMarket");
const { SYNTHETIC_ACCOUNTS } = require("./syntheticAccounts");

console.log("================================================================================");
console.log("    CAPITALUP SUITE: MATCHING ENGINE CORE CORRECTNESS TESTS                    ");
console.log("================================================================================");

let testsPassed = 0;
let testsFailed = 0;

function runScenario(name, fn) {
    try {
        fn();
        console.log(`  ✓ PASS: ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(err.message);
        testsFailed++;
        throw err;
    }
}

function assertOrderBookIntegrity(engine, symbol) {
    const inv = engine.validateInvariants(symbol);
    assert.strictEqual(inv.valid, true, `Invariants failed for ${symbol}`);
}

// -----------------------------------------------------------------------------
// 1. BUY vs SELL: Exact Fill
// -----------------------------------------------------------------------------
runScenario("Core: BUY vs SELL Exact Fill", () => {
    const engine = new MatchingEngine();
    const clock = new FakeMarketClock();
    const sym = "RELIANCE";

    // SELL 100 shares @ ₹1247.70
    engine.placeOrder({
        id: "sell-exact",
        userId: SYNTHETIC_ACCOUNTS.MARKET_MAKER.userId,
        symbol: sym,
        side: "SELL",
        quantity: 100,
        limitPrice: NSE_EQUITY_UNIVERSE.RELIANCE.referencePrice,
        createdAt: clock.now()
    });

    clock.tick(10);

    // BUY 100 shares @ ₹1247.70
    const buyRes = engine.placeOrder({
        id: "buy-exact",
        userId: SYNTHETIC_ACCOUNTS.RETAIL_ACCOUNT.userId,
        symbol: sym,
        side: "BUY",
        quantity: 100,
        limitPrice: NSE_EQUITY_UNIVERSE.RELIANCE.referencePrice,
        createdAt: clock.now()
    });

    assert.strictEqual(buyRes.trades.length, 1);
    assert.strictEqual(buyRes.trades[0].executedQuantity, 100);
    assert.strictEqual(buyRes.trades[0].executedPrice, 1247.70);
    assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
    assertOrderBookIntegrity(engine, sym);
});

// -----------------------------------------------------------------------------
// 2. Partial Fill & Remainder Resting
// -----------------------------------------------------------------------------
runScenario("Core: Partial Fill & Resting Remainder", () => {
    const engine = new MatchingEngine();
    const sym = "TCS";
    const ref = NSE_EQUITY_UNIVERSE.TCS.referencePrice;

    // Resting SELL 100 @ ref
    engine.placeOrder({
        id: "sell-partial",
        userId: SYNTHETIC_ACCOUNTS.MARKET_MAKER.userId,
        symbol: sym,
        side: "SELL",
        quantity: 100,
        limitPrice: ref
    });

    // BUY 40 @ ref
    const buyRes = engine.placeOrder({
        id: "buy-partial",
        userId: SYNTHETIC_ACCOUNTS.RETAIL_ACCOUNT.userId,
        symbol: sym,
        side: "BUY",
        quantity: 40,
        limitPrice: ref
    });

    assert.strictEqual(buyRes.trades.length, 1);
    assert.strictEqual(buyRes.trades[0].executedQuantity, 40);
    assert.strictEqual(buyRes.filledQuantity, 40);

    const book = engine.getOrderBook(sym);
    const restingSell = book.getOrder("sell-partial");
    assert.strictEqual(restingSell.remainingQuantity, 60);
    assert.strictEqual(restingSell.filledQuantity, 40);
    assert.strictEqual(book.bestAsk().totalQuantity, 60);
    assertOrderBookIntegrity(engine, sym);
});

// -----------------------------------------------------------------------------
// 3. Multi-Level Fill with Price Priority
// -----------------------------------------------------------------------------
runScenario("Core: Multi-Level Fill with Price Priority (BUY 105 x 100 vs Asks)", () => {
    const engine = new MatchingEngine();
    const sym = "INFY";

    // Asks: 20 @ 100, 30 @ 101, 50 @ 102
    engine.placeOrder({ id: "s1", userId: "u1", symbol: sym, side: "SELL", quantity: 20, limitPrice: 100 });
    engine.placeOrder({ id: "s2", userId: "u2", symbol: sym, side: "SELL", quantity: 30, limitPrice: 101 });
    engine.placeOrder({ id: "s3", userId: "u3", symbol: sym, side: "SELL", quantity: 50, limitPrice: 102 });

    // Aggressive BUY 100 @ 105
    const buyRes = engine.placeOrder({
        id: "b-agg",
        userId: "u-buyer",
        symbol: sym,
        side: "BUY",
        quantity: 100,
        limitPrice: 105
    });

    assert.strictEqual(buyRes.trades.length, 3);
    assert.strictEqual(buyRes.trades[0].executedPrice, 100);
    assert.strictEqual(buyRes.trades[0].executedQuantity, 20);
    assert.strictEqual(buyRes.trades[1].executedPrice, 101);
    assert.strictEqual(buyRes.trades[1].executedQuantity, 30);
    assert.strictEqual(buyRes.trades[2].executedPrice, 102);
    assert.strictEqual(buyRes.trades[2].executedQuantity, 50);
    assert.strictEqual(buyRes.filledQuantity, 100);
    assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
    assertOrderBookIntegrity(engine, sym);
});

// -----------------------------------------------------------------------------
// 4. Same-Price FIFO Priority Across Sizes (MICRO to LARGE)
// -----------------------------------------------------------------------------
runScenario("FIFO: Same-Price Queue Priority (SELL A=10, B=20, C=30; BUY 25 -> A=10, B=15, C=30)", () => {
    const engine = new MatchingEngine();
    const sym = "HDFCBANK";
    const ref = NSE_EQUITY_UNIVERSE.HDFCBANK.referencePrice;

    // Test across scale profiles: 1x, 10x, 100x, 10000x
    for (const multiplier of [1, 10, 100, 10000]) {
        const eng = new MatchingEngine();
        const qA = 10 * multiplier;
        const qB = 20 * multiplier;
        const qC = 30 * multiplier;
        const buyQty = 25 * multiplier;

        eng.placeOrder({ id: "sA", userId: "uA", symbol: sym, side: "SELL", quantity: qA, limitPrice: ref });
        eng.placeOrder({ id: "sB", userId: "uB", symbol: sym, side: "SELL", quantity: qB, limitPrice: ref });
        eng.placeOrder({ id: "sC", userId: "uC", symbol: sym, side: "SELL", quantity: qC, limitPrice: ref });

        const buyRes = eng.placeOrder({ id: "bX", userId: "uX", symbol: sym, side: "BUY", quantity: buyQty, limitPrice: ref });

        assert.strictEqual(buyRes.trades.length, 2);
        assert.strictEqual(buyRes.trades[0].makerOrderId, "sA");
        assert.strictEqual(buyRes.trades[0].executedQuantity, qA);
        assert.strictEqual(buyRes.trades[1].makerOrderId, "sB");
        assert.strictEqual(buyRes.trades[1].executedQuantity, 15 * multiplier);

        const book = eng.getOrderBook(sym);
        assert.strictEqual(book.getOrder("sA"), null); // Filled & removed
        assert.strictEqual(book.getOrder("sB").remainingQuantity, 5 * multiplier);
        assert.strictEqual(book.getOrder("sC").remainingQuantity, qC);
        assertOrderBookIntegrity(eng, sym);
    }
});

// -----------------------------------------------------------------------------
// 5. Market Order: Sweep Multiple Levels & Remainder Handling
// -----------------------------------------------------------------------------
runScenario("Market Order: Sweep Multiple Ask Levels (100@100, 200@101, 300@102; MARKET BUY 500)", () => {
    const engine = new MatchingEngine();
    const sym = "ICICIBANK";

    // Asks: 100 @ 100, 200 @ 101, 300 @ 102
    engine.placeOrder({ id: "ask1", userId: "u1", symbol: sym, side: "SELL", quantity: 100, limitPrice: 100 });
    engine.placeOrder({ id: "ask2", userId: "u2", symbol: sym, side: "SELL", quantity: 200, limitPrice: 101 });
    engine.placeOrder({ id: "ask3", userId: "u3", symbol: sym, side: "SELL", quantity: 300, limitPrice: 102 });

    const mktBuy = engine.placeOrder({
        id: "mkt-500",
        userId: "u-taker",
        symbol: sym,
        side: "BUY",
        quantity: 500,
        orderType: "MARKET"
    });

    assert.strictEqual(mktBuy.trades.length, 3);
    assert.strictEqual(mktBuy.trades[0].executedPrice, 100);
    assert.strictEqual(mktBuy.trades[0].executedQuantity, 100);
    assert.strictEqual(mktBuy.trades[1].executedPrice, 101);
    assert.strictEqual(mktBuy.trades[1].executedQuantity, 200);
    assert.strictEqual(mktBuy.trades[2].executedPrice, 102);
    assert.strictEqual(mktBuy.trades[2].executedQuantity, 200);

    const book = engine.getOrderBook(sym);
    assert.strictEqual(book.bestAsk().price, 102);
    assert.strictEqual(book.bestAsk().totalQuantity, 100); // 100 remaining @ 102
    assertOrderBookIntegrity(engine, sym);
});

// -----------------------------------------------------------------------------
// 6. Market Order on Empty Book
// -----------------------------------------------------------------------------
runScenario("Market Order: Empty Book Rejection / Exhaustion", () => {
    const engine = new MatchingEngine();
    const sym = "RELIANCE";

    const res = engine.placeOrder({
        id: "mkt-empty",
        userId: "u1",
        symbol: sym,
        side: "BUY",
        quantity: 50,
        orderType: "MARKET"
    });

    assert.strictEqual(res.trades.length, 0);
    assert.strictEqual(res.status, "CANCELLED"); // Market remainder cancels
    assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
    assertOrderBookIntegrity(engine, sym);
});

// -----------------------------------------------------------------------------
// 7. Cancel vs Match Race Conditions
// -----------------------------------------------------------------------------
runScenario("Race: Deterministic Sequencing (PLACE -> CANCEL -> MATCH vs PLACE -> MATCH -> CANCEL)", () => {
    const sym = "TCS";

    // CASE A: PLACE -> CANCEL -> MATCH
    for (let i = 0; i < 100; i++) {
        const eng = new MatchingEngine();
        eng.placeOrder({ id: `ord-${i}`, userId: "u1", symbol: sym, side: "SELL", quantity: 10, limitPrice: 2000 });
        const cancelRes = eng.cancelOrder(sym, `ord-${i}`);
        assert.strictEqual(cancelRes.success, true);
        const matchRes = eng.placeOrder({ id: `buy-${i}`, userId: "u2", symbol: sym, side: "BUY", quantity: 10, limitPrice: 2000 });
        assert.strictEqual(matchRes.trades.length, 0); // Must NOT match!
        assertOrderBookIntegrity(eng, sym);
    }

    // CASE B: PLACE -> MATCH -> CANCEL
    for (let i = 0; i < 100; i++) {
        const eng = new MatchingEngine();
        eng.placeOrder({ id: `ord-${i}`, userId: "u1", symbol: sym, side: "SELL", quantity: 10, limitPrice: 2000 });
        const matchRes = eng.placeOrder({ id: `buy-${i}`, userId: "u2", symbol: sym, side: "BUY", quantity: 10, limitPrice: 2000 });
        assert.strictEqual(matchRes.trades.length, 1); // Traded!
        const cancelRes = eng.cancelOrder(sym, `ord-${i}`);
        assert.strictEqual(cancelRes.success, false); // Cannot cancel filled order
        assertOrderBookIntegrity(eng, sym);
    }
});

// -----------------------------------------------------------------------------
// 8. Order Modification Priority Preservation Rules
// -----------------------------------------------------------------------------
runScenario("Modification: Quantity Reduction Preserves Priority; Price Change Resets Priority", () => {
    const engine = new MatchingEngine();
    const sym = "INFY";

    engine.placeOrder({ id: "first", userId: "u1", symbol: sym, side: "BUY", quantity: 50, limitPrice: 1000 });
    engine.placeOrder({ id: "second", userId: "u2", symbol: sym, side: "BUY", quantity: 50, limitPrice: 1000 });

    // Reduce "first" from 50 to 20 -> Priority preserved
    const mod1 = engine.modifyOrder(sym, "first", 1000, 20);
    assert.strictEqual(mod1.success, true);

    const sell1 = engine.placeOrder({ id: "s-test", userId: "u-seller", symbol: sym, side: "SELL", quantity: 20, limitPrice: 1000 });
    assert.strictEqual(sell1.trades[0].makerOrderId, "first"); // "first" still matched first!

    // Change "second" price to 1005 -> resets position
    const mod2 = engine.modifyOrder(sym, "second", 1005, 50);
    assert.strictEqual(mod2.success, true);
    assert.strictEqual(engine.getOrderBook(sym).bestBid().price, 1005);
    assertOrderBookIntegrity(engine, sym);
});

// -----------------------------------------------------------------------------
// 9. Stop Orders: Multi-Level Price Jump Triggering
// -----------------------------------------------------------------------------
runScenario("Stop Orders: Market Jump from 99 to 112 Triggers All Eligible Stops (100, 105, 110)", () => {
    const engine = new MatchingEngine();
    const sym = "RELIANCE";

    engine.placeStopOrder({ id: "stopA", userId: "u1", symbol: sym, side: "BUY", quantity: 10, stopPrice: 100 });
    engine.placeStopOrder({ id: "stopB", userId: "u2", symbol: sym, side: "BUY", quantity: 20, stopPrice: 105 });
    engine.placeStopOrder({ id: "stopC", userId: "u3", symbol: sym, side: "BUY", quantity: 30, stopPrice: 110 });

    // Market jumps to 112
    const triggered = engine.processMarketPriceForStops(sym, 112);
    assert.strictEqual(triggered.length, 3);
    const triggeredIds = triggered.map(t => t.orderId);
    assert(triggeredIds.includes("stopA"));
    assert(triggeredIds.includes("stopB"));
    assert(triggeredIds.includes("stopC"));
});

// -----------------------------------------------------------------------------
// 10. OCO (One-Cancels-the-Other) Atomic Cancellation
// -----------------------------------------------------------------------------
runScenario("OCO: LIMIT Execution Atomically Cancels STOP Leg; STOP Trigger Cancels LIMIT Leg", () => {
    const engine = new MatchingEngine();
    const sym = "TCS";

    // Leg 1: LIMIT Leg fills -> STOP cancels
    engine.placeOrder({ id: "oco-lim-1", userId: "u1", symbol: sym, side: "SELL", quantity: 10, limitPrice: 2200 });
    engine.placeStopOrder({ id: "oco-stp-1", userId: "u1", symbol: sym, side: "SELL", quantity: 10, stopPrice: 1900, linkedLimitOrderId: "oco-lim-1" });

    // Buyer fills limit leg
    engine.placeOrder({ id: "buyer-1", userId: "u2", symbol: sym, side: "BUY", quantity: 10, limitPrice: 2200 });
    assert.strictEqual(engine.getStopOrder(sym, "oco-stp-1"), null); // STOP automatically removed!

    // Leg 2: STOP triggers -> LIMIT cancels
    engine.placeOrder({ id: "oco-lim-2", userId: "u3", symbol: sym, side: "SELL", quantity: 10, limitPrice: 2200 });
    engine.placeStopOrder({ id: "oco-stp-2", userId: "u3", symbol: sym, side: "SELL", quantity: 10, stopPrice: 1900, linkedLimitOrderId: "oco-lim-2" });

    engine.processMarketPriceForStops(sym, 1850); // triggers stop
    assert.strictEqual(engine.getOrderBook(sym).getOrder("oco-lim-2"), null); // LIMIT leg automatically cancelled!
    assertOrderBookIntegrity(engine, sym);
});

// -----------------------------------------------------------------------------
// 11. Self-Trade Prevention (CANCEL_NEW)
// -----------------------------------------------------------------------------
runScenario("Self-Trade Prevention: CANCEL_NEW Policy for Same Account", () => {
    const engine = new MatchingEngine();
    const sym = "HDFCBANK";
    const ref = NSE_EQUITY_UNIVERSE.HDFCBANK.referencePrice;

    // Resting SELL by User-Alpha
    engine.placeOrder({ id: "maker-1", userId: "user-alpha", symbol: sym, side: "SELL", quantity: 50, limitPrice: ref });

    // Incoming BUY also by User-Alpha
    const stpBuy = engine.placeOrder({ id: "taker-1", userId: "user-alpha", symbol: sym, side: "BUY", quantity: 50, limitPrice: ref });

    assert.strictEqual(stpBuy.status, "CANCELLED");
    assert.strictEqual(stpBuy.reason, "SELF_TRADE_PREVENTED");
    assert.strictEqual(stpBuy.trades.length, 0);

    // Resting order maker-1 is intact
    const resting = engine.getOrderBook(sym).getOrder("maker-1");
    assert(resting !== null);
    assert.strictEqual(resting.remainingQuantity, 50);
    assertOrderBookIntegrity(engine, sym);
});

console.log("================================================================================");
console.log(`CORE MATCHING TESTS COMPLETED: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log("================================================================================\n");

module.exports = { runScenario, assertOrderBookIntegrity };
