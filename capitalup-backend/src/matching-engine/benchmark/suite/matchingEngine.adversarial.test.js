/**
 * matchingEngine.adversarial.test.js
 * 
 * Adversarial Synthetic Stress Patterns for the CapitalUp Matching Engine:
 * 1. Rapid Add / Cancel Churn
 * 2. Deep FIFO Queue (Thousands of orders at the same price)
 * 3. Wide Tree Stress (Thousands of distinct price levels)
 * 4. Order Fragmentation (1 large order consumed by 500 micro-orders)
 * 5. High-Frequency BUY/SELL Alternation
 * 6. Repeated Near-Fill FOK Testing
 * 7. Mixed Multi-Order Type Adversarial Storm (LIMIT, MARKET, FOK, IOC, CANCEL)
 */

const assert = require("assert");
const MatchingEngine = require("../../engine/MatchingEngine");
const { SeededRandom, NSE_EQUITY_UNIVERSE } = require("./syntheticMarket");

console.log("================================================================================");
console.log("    CAPITALUP SUITE: ADVERSARIAL STRESS & INVARIANT INTEGRITY TESTS            ");
console.log("================================================================================");

let testsPassed = 0;
let testsFailed = 0;

function runAdversarialTest(name, fn) {
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
// 1. Rapid Add / Cancel Churn (5,000 rapid cycles)
// -----------------------------------------------------------------------------
runAdversarialTest("Stress 1: Rapid Add/Cancel Churn (5,000 orders placed & immediately cancelled)", () => {
    const engine = new MatchingEngine();
    const sym = "RELIANCE";

    for (let i = 0; i < 5000; i++) {
        const id = `churn-${i}`;
        engine.placeOrder({ id, userId: `u-${i % 100}`, symbol: sym, side: "SELL", quantity: 10, limitPrice: 1250 });
        const cancelRes = engine.cancelOrder(sym, id);
        assert.strictEqual(cancelRes.success, true);
    }

    assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
    const inv = engine.validateInvariants(sym);
    assert.strictEqual(inv.valid, true);
});

// -----------------------------------------------------------------------------
// 2. Deep FIFO Queue (2,500 orders at the exact same price)
// -----------------------------------------------------------------------------
runAdversarialTest("Stress 2: Deep FIFO Queue (2,500 orders at exact same price level)", () => {
    const engine = new MatchingEngine();
    const sym = "TCS";
    const price = 2118.80;

    for (let i = 0; i < 2500; i++) {
        engine.placeOrder({ id: `fifo-deep-${i}`, userId: `u-${i}`, symbol: sym, side: "SELL", quantity: 2, limitPrice: price });
    }

    const book = engine.getOrderBook(sym);
    assert.strictEqual(book.orderCount(), 2500);
    assert.strictEqual(book.bestAsk().totalQuantity, 5000);

    // Consume half the queue with 1 buy order (2500 shares = 1250 orders)
    const buyRes = engine.placeOrder({ id: "eater", userId: "taker", symbol: sym, side: "BUY", quantity: 2500, limitPrice: price });
    assert.strictEqual(buyRes.trades.length, 1250);
    assert.strictEqual(book.orderCount(), 1250);
    assert.strictEqual(book.bestAsk().totalQuantity, 2500);

    const inv = engine.validateInvariants(sym);
    assert.strictEqual(inv.valid, true);
});

// -----------------------------------------------------------------------------
// 3. Wide Tree (2,000 distinct price levels)
// -----------------------------------------------------------------------------
runAdversarialTest("Stress 3: Wide RB-Tree (2,000 distinct price levels insertion and traversal)", () => {
    const engine = new MatchingEngine();
    const sym = "INFY";

    for (let i = 1; i <= 2000; i++) {
        const p = Number((1000 + i * 0.05).toFixed(2));
        engine.placeOrder({ id: `lvl-${i}`, userId: `u-${i}`, symbol: sym, side: "SELL", quantity: 5, limitPrice: p });
    }

    const book = engine.getOrderBook(sym);
    assert.strictEqual(book.orderCount(), 2000);
    assert.strictEqual(book.bestAsk().price, 1000.05);

    const inv = engine.validateInvariants(sym);
    assert.strictEqual(inv.valid, true);
});

// -----------------------------------------------------------------------------
// 4. Order Fragmentation (1 large order consumed by 500 micro orders)
// -----------------------------------------------------------------------------
runAdversarialTest("Stress 4: Order Fragmentation (1 large resting order sliced by 500 micro-orders)", () => {
    const engine = new MatchingEngine();
    const sym = "HDFCBANK";
    const ref = 739.50;

    // Resting SELL 1,000 shares
    engine.placeOrder({ id: "whale-sell", userId: "whale", symbol: sym, side: "SELL", quantity: 1000, limitPrice: ref });

    // 500 micro BUY orders of 2 shares each
    for (let i = 0; i < 500; i++) {
        const res = engine.placeOrder({ id: `micro-buy-${i}`, userId: `u-${i}`, symbol: sym, side: "BUY", quantity: 2, limitPrice: ref });
        assert.strictEqual(res.trades.length, 1);
        assert.strictEqual(res.trades[0].makerOrderId, "whale-sell");
    }

    assert.strictEqual(engine.getOrderBook(sym).orderCount(), 0);
    const inv = engine.validateInvariants(sym);
    assert.strictEqual(inv.valid, true);
});

// -----------------------------------------------------------------------------
// 5. Deterministic Random Stress Storm (LIMIT, MARKET, FOK, IOC, CANCEL)
// -----------------------------------------------------------------------------
runAdversarialTest("Stress 5: Deterministic Mixed Workload Storm (10,000 random operations, Seed: 42)", () => {
    const engine = new MatchingEngine();
    const rng = new SeededRandom(42);
    const sym = "ICICIBANK";
    const basePrice = 1345.00;
    const activeIds = [];

    for (let i = 0; i < 10000; i++) {
        const roll = rng.next();
        const id = `storm-${i}`;

        if (roll < 0.40) {
            // Resting or crossing LIMIT
            const offset = (rng.intRange(-20, 20)) * 0.05;
            const p = Number((basePrice + offset).toFixed(2));
            const side = rng.next() > 0.5 ? "BUY" : "SELL";
            const qty = rng.intRange(1, 20);

            const res = engine.placeOrder({ id, userId: `user-${i % 200}`, symbol: sym, side, quantity: qty, limitPrice: p });
            if (res.remainingOrder) activeIds.push(id);
        } else if (roll < 0.60 && activeIds.length > 0) {
            // CANCEL an existing order
            const targetIndex = Math.floor(rng.next() * activeIds.length);
            const targetId = activeIds.splice(targetIndex, 1)[0];
            engine.cancelOrder(sym, targetId);
        } else if (roll < 0.80) {
            // FOK test
            const side = rng.next() > 0.5 ? "BUY" : "SELL";
            const p = Number((basePrice + (rng.intRange(-5, 5)) * 0.05).toFixed(2));
            engine.placeOrder({ id, userId: `user-${i % 200}`, symbol: sym, side, quantity: rng.intRange(1, 15), limitPrice: p, timeInForce: "FOK" });
        } else {
            // Aggressive MARKET order
            const side = rng.next() > 0.5 ? "BUY" : "SELL";
            engine.placeOrder({ id, userId: `user-${i % 200}`, symbol: sym, side, quantity: rng.intRange(1, 10), orderType: "MARKET" });
        }
    }

    const inv = engine.validateInvariants(sym);
    assert.strictEqual(inv.valid, true, "All 14 engine invariants must hold after 10,000-order stress storm");
});

console.log("================================================================================");
console.log(`ADVERSARIAL TESTS COMPLETED: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log("================================================================================\n");
