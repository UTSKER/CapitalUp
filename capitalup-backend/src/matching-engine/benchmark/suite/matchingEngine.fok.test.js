/**
 * matchingEngine.fok.test.js
 * 
 * Deep, exhaustive Fill-Or-Kill (FOK) Test Suite for the CapitalUp Matching Engine:
 * - Read-only liquidity inspection (Zero mutation on failure)
 * - Exact fill across multiple price levels
 * - Rejection when quantity exceeds available liquidity by 1 share
 * - Rejection when price is outside permissible limit
 * - Scale testing: 1 share, 100 shares, 1,000 shares, 100,000 shares, 1,000,000 shares
 * - Assertion of CRITICAL INVARIANT: trades === 0, filledQuantity === 0, book unchanged
 */

const assert = require("assert");
const MatchingEngine = require("../../engine/MatchingEngine");
const { NSE_EQUITY_UNIVERSE } = require("./syntheticMarket");

console.log("================================================================================");
console.log("    CAPITALUP SUITE: FILL-OR-KILL (FOK) DEEP TEST SUITE                        ");
console.log("================================================================================");

let testsPassed = 0;
let testsFailed = 0;

function runFOKTest(name, fn) {
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

// -----------------------------------------------------------------------------
// 1. Exact Multi-Level Full Fill vs 1-Share Shortfall (Section 6 Example)
// -----------------------------------------------------------------------------
runFOKTest("FOK: Exact 100-Share Multi-Level Fill (50@100, 30@101, 20@102)", () => {
    const engine = new MatchingEngine();
    const sym = "RELIANCE";

    engine.placeOrder({ id: "s1", userId: "u1", symbol: sym, side: "SELL", quantity: 50, limitPrice: 100 });
    engine.placeOrder({ id: "s2", userId: "u2", symbol: sym, side: "SELL", quantity: 30, limitPrice: 101 });
    engine.placeOrder({ id: "s3", userId: "u3", symbol: sym, side: "SELL", quantity: 20, limitPrice: 102 });

    const fokRes = engine.placeOrder({
        id: "fok-exact",
        userId: "u-fok",
        symbol: sym,
        side: "BUY",
        quantity: 100,
        limitPrice: 102,
        timeInForce: "FOK"
    });

    assert.strictEqual(fokRes.status, "FILLED");
    assert.strictEqual(fokRes.filledQuantity, 100);
    assert.strictEqual(fokRes.trades.length, 3);
    assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
    engine.validateInvariants(sym);
});

runFOKTest("FOK: 101-Share Shortfall Must Yield ZERO Trades and ZERO Book Mutation", () => {
    const engine = new MatchingEngine();
    const sym = "RELIANCE";

    engine.placeOrder({ id: "s1", userId: "u1", symbol: sym, side: "SELL", quantity: 50, limitPrice: 100 });
    engine.placeOrder({ id: "s2", userId: "u2", symbol: sym, side: "SELL", quantity: 30, limitPrice: 101 });
    engine.placeOrder({ id: "s3", userId: "u3", symbol: sym, side: "SELL", quantity: 20, limitPrice: 102 });

    const preCount = engine.getOrderBook(sym).orderCount();

    // Needs 101, but only 100 exists
    const fokRes = engine.placeOrder({
        id: "fok-shortfall",
        userId: "u-fok",
        symbol: sym,
        side: "BUY",
        quantity: 101,
        limitPrice: 102,
        timeInForce: "FOK"
    });

    // CRITICAL INVARIANTS:
    assert.strictEqual(fokRes.status, "REJECTED");
    assert.strictEqual(fokRes.reason, "FOK_NOT_FILLABLE");
    assert.strictEqual(fokRes.trades.length, 0, "FOK failed trades must be 0");
    assert.strictEqual(fokRes.filledQuantity, 0, "FOK failed filledQuantity must be 0");
    assert.strictEqual(engine.getOrderBook(sym).orderCount(), preCount, "Book must remain untouched");
    assert.strictEqual(engine.getOrderBook(sym).getOrder("s1").remainingQuantity, 50);
    assert.strictEqual(engine.getOrderBook(sym).getOrder("s2").remainingQuantity, 30);
    assert.strictEqual(engine.getOrderBook(sym).getOrder("s3").remainingQuantity, 20);
    engine.validateInvariants(sym);
});

// -----------------------------------------------------------------------------
// 2. FOK Against Liquidity Outside Limit Price
// -----------------------------------------------------------------------------
runFOKTest("FOK: Liquidity Exists But Beyond Limit Price (Must Reject with Zero Fill)", () => {
    const engine = new MatchingEngine();
    const sym = "TCS";

    // 50 @ 2000, 50 @ 2010
    engine.placeOrder({ id: "s1", userId: "u1", symbol: sym, side: "SELL", quantity: 50, limitPrice: 2000 });
    engine.placeOrder({ id: "s2", userId: "u2", symbol: sym, side: "SELL", quantity: 50, limitPrice: 2010 });

    // Buyer wants 70 shares FOK, but limit price is 2005 (only 50 available at or below 2005)
    const fokRes = engine.placeOrder({
        id: "fok-price-limit",
        userId: "u-fok",
        symbol: sym,
        side: "BUY",
        quantity: 70,
        limitPrice: 2005,
        timeInForce: "FOK"
    });

    assert.strictEqual(fokRes.status, "REJECTED");
    assert.strictEqual(fokRes.filledQuantity, 0);
    assert.strictEqual(fokRes.trades.length, 0);
    assert.strictEqual(engine.getOrderBook(sym).getOrder("s1").remainingQuantity, 50);
    engine.validateInvariants(sym);
});

// -----------------------------------------------------------------------------
// 3. FOK Scale Testing Across Sizes (1 to 1,000,000 Shares)
// -----------------------------------------------------------------------------
const SCALE_SIZES = [1, 100, 1000, 100000, 1000000];

for (const size of SCALE_SIZES) {
    runFOKTest(`FOK Scale: Successful Full Fill at ${size.toLocaleString()} Shares`, () => {
        const engine = new MatchingEngine();
        const sym = "INFY";

        // Provide exactly 'size' shares
        engine.placeOrder({ id: `maker-${size}`, userId: "u1", symbol: sym, side: "SELL", quantity: size, limitPrice: 1000 });

        const fokRes = engine.placeOrder({
            id: `fok-${size}`,
            userId: "u-fok",
            symbol: sym,
            side: "BUY",
            quantity: size,
            limitPrice: 1000,
            timeInForce: "FOK"
        });

        assert.strictEqual(fokRes.status, "FILLED");
        assert.strictEqual(fokRes.filledQuantity, size);
        assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
        engine.validateInvariants(sym);
    });

    runFOKTest(`FOK Scale: Safe Rejection at ${size.toLocaleString()} Shares When Liquidity Is Zero`, () => {
        const engine = new MatchingEngine();
        const sym = "HDFCBANK";

        const fokRes = engine.placeOrder({
            id: `fok-empty-${size}`,
            userId: "u-fok",
            symbol: sym,
            side: "BUY",
            quantity: size,
            limitPrice: 1000,
            timeInForce: "FOK"
        });

        assert.strictEqual(fokRes.status, "REJECTED");
        assert.strictEqual(fokRes.filledQuantity, 0);
        assert.strictEqual(fokRes.trades.length, 0);
        assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
        engine.validateInvariants(sym);
    });
}

// -----------------------------------------------------------------------------
// 4. FOK SELL Order Against Bids
// -----------------------------------------------------------------------------
runFOKTest("FOK: SELL FOK Order Against Multiple Bids", () => {
    const engine = new MatchingEngine();
    const sym = "ICICIBANK";

    // Bids: 40 @ 100, 60 @ 99
    engine.placeOrder({ id: "b1", userId: "u1", symbol: sym, side: "BUY", quantity: 40, limitPrice: 100 });
    engine.placeOrder({ id: "b2", userId: "u2", symbol: sym, side: "BUY", quantity: 60, limitPrice: 99 });

    // SELL FOK 100 @ limit 99 (available: 40@100 + 60@99 = 100) -> Must fill all 100!
    const fokSell = engine.placeOrder({
        id: "fok-sell-100",
        userId: "u-seller",
        symbol: sym,
        side: "SELL",
        quantity: 100,
        limitPrice: 99,
        timeInForce: "FOK"
    });

    assert.strictEqual(fokSell.status, "FILLED");
    assert.strictEqual(fokSell.filledQuantity, 100);
    assert.strictEqual(fokSell.trades.length, 2);
    assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
    engine.validateInvariants(sym);
});

console.log("================================================================================");
console.log(`FOK TESTS COMPLETED: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log("================================================================================\n");
