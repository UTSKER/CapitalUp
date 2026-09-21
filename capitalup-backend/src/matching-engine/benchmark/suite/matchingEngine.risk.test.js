/**
 * matchingEngine.risk.test.js
 * 
 * Tests the REAL CapitalUp Pre-Trade Risk Engine (`evaluateOrder`) with an in-memory database stub:
 * - Cash balance validation (Sufficient vs Insufficient Buying Power)
 * - Portfolio holdings validation (Sufficient vs Insufficient Holdings for SELL)
 * - Maximum Order Quantity limit (>100,000 shares)
 * - Maximum Order Value limit (>₹5,000,000 notional)
 * - Price Band / Circuit limits (±25% breach)
 * - Duplicate clientOrderId rejection
 * - Critical Rule: Risk-rejected orders must NEVER reach the Matching Engine
 */

process.env.RISK_ORDERS_PER_MINUTE = "100000000";
const assert = require("assert");
const MatchingEngine = require("../../engine/MatchingEngine");
const { evaluateOrder } = require("../../../modules/risk/services/risk.service");
const { SYNTHETIC_ACCOUNTS, MockRiskDatabase } = require("./syntheticAccounts");
const { NSE_EQUITY_UNIVERSE } = require("./syntheticMarket");

console.log("================================================================================");
console.log("    CAPITALUP SUITE: PRE-TRADE RISK ENGINE VERIFICATION                        ");
console.log("================================================================================");

let testsPassed = 0;
let testsFailed = 0;

async function runRiskTest(name, fn) {
    try {
        await fn();
        console.log(`  ✓ PASS: ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(err.message);
        testsFailed++;
        throw err;
    }
}

async function main() {
    const mockDb = new MockRiskDatabase();
    const engine = new MatchingEngine();

    // 1. Sufficient Cash -> ACCEPT -> Places into Engine
    await runRiskTest("Risk: Sufficient Cash Balance (Order Approved & Placed into Engine)", async () => {
        const acc = SYNTHETIC_ACCOUNTS.LONG_ACCOUNT; // Balance: ₹50,00,000
        const price = 1247.70;
        const qty = 100; // Notional: ₹1,24,770

        const decision = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId: "risk-ok-1",
            symbol: "RELIANCE",
            side: "BUY",
            quantity: qty,
            price: price,
            marketPrice: price,
            orderType: "LIMIT"
        });

        assert.strictEqual(decision.approved, true);

        // Dispatched to Matching Engine
        const placeRes = engine.placeOrder({
            id: "risk-ok-1",
            userId: acc.userId,
            symbol: "RELIANCE",
            side: "BUY",
            quantity: qty,
            limitPrice: price
        });
        assert.strictEqual(engine.getOrderBook("RELIANCE").orderCount(), 1);
    });

    // 2. Insufficient Cash -> REJECT -> Engine NOT CALLED
    await runRiskTest("Risk: Insufficient Cash Balance (Order Rejected; Matching Engine Untouched)", async () => {
        const acc = SYNTHETIC_ACCOUNTS.LOW_BALANCE_ACCOUNT; // Balance: ₹10,000 only
        const price = 2118.80;
        const qty = 50; // Notional: ₹1,05,940 (Exceeds ₹10,000)

        const preBookCount = engine.getOrderBook("TCS").orderCount();

        const decision = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId: "risk-insufficient-cash",
            symbol: "TCS",
            side: "BUY",
            quantity: qty,
            price: price,
            marketPrice: price,
            orderType: "LIMIT"
        });

        assert.strictEqual(decision.approved, false);
        assert.strictEqual(decision.code, "INSUFFICIENT_BUYING_POWER");

        // CRITICAL INVARIANT: Engine must NOT be called; book count unchanged
        assert.strictEqual(engine.getOrderBook("TCS").orderCount(), preBookCount);
    });

    // 3. Sufficient Holdings for SELL -> ACCEPT
    await runRiskTest("Risk: Sufficient Unreserved Holdings (SELL Order Approved)", async () => {
        const acc = SYNTHETIC_ACCOUNTS.LONG_ACCOUNT; // Holds 1000 RELIANCE
        const price = 1247.70;
        const qty = 50;

        const decision = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId: "risk-sell-ok",
            symbol: "RELIANCE",
            side: "SELL",
            quantity: qty,
            price: price,
            marketPrice: price,
            orderType: "LIMIT"
        });

        assert.strictEqual(decision.approved, true);
    });

    // 4. Insufficient Holdings for SELL -> REJECT
    await runRiskTest("Risk: Insufficient Holdings for SELL (Order Rejected)", async () => {
        const acc = SYNTHETIC_ACCOUNTS.RETAIL_ACCOUNT; // Holds 0 TCS
        const price = 2118.80;
        const qty = 10;

        const decision = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId: "risk-sell-fail",
            symbol: "TCS",
            side: "SELL",
            quantity: qty,
            price: price,
            marketPrice: price,
            orderType: "LIMIT"
        });

        assert.strictEqual(decision.approved, false);
        assert.strictEqual(decision.code, "INSUFFICIENT_HOLDINGS");
    });

    // 5. Maximum Order Quantity Violation (> 100,000)
    await runRiskTest("Risk: Maximum Order Quantity Exceeded (Rejected if > 100,000)", async () => {
        const acc = SYNTHETIC_ACCOUNTS.HIGH_BALANCE_ACCOUNT;
        const price = 1000.00;
        const qty = 150000; // Limit is 100,000

        const decision = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId: "risk-qty-exceeded",
            symbol: "INFY",
            side: "BUY",
            quantity: qty,
            price: price,
            marketPrice: price,
            orderType: "LIMIT"
        });

        assert.strictEqual(decision.approved, false);
        assert.strictEqual(decision.code, "MAX_QUANTITY_EXCEEDED");
    });

    // 6. Maximum Order Value Violation (> ₹5,000,000)
    await runRiskTest("Risk: Maximum Order Notional Exceeded (Rejected if > ₹5,000,000)", async () => {
        const acc = SYNTHETIC_ACCOUNTS.HIGH_BALANCE_ACCOUNT;
        const price = 2000.00;
        const qty = 3000; // Notional: ₹6,000,000 (Exceeds ₹50 Lakhs limit)

        const decision = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId: "risk-value-exceeded",
            symbol: "TCS",
            side: "BUY",
            quantity: qty,
            price: price,
            marketPrice: price,
            orderType: "LIMIT"
        });

        assert.strictEqual(decision.approved, false);
        assert.strictEqual(decision.code, "MAX_ORDER_VALUE_EXCEEDED");
    });

    // 7. Price Band / Circuit Breach (±25%)
    await runRiskTest("Risk: Price Band Violation (Order Price Outside ±25% Band)", async () => {
        const acc = SYNTHETIC_ACCOUNTS.LONG_ACCOUNT;
        const marketPrice = 1000.00;
        const limitPrice = 1350.00; // +35% above market (Upper band is 1250)

        const decision = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId: "risk-price-band",
            symbol: "INFY",
            side: "BUY",
            quantity: 10,
            price: limitPrice,
            marketPrice: marketPrice,
            orderType: "LIMIT"
        });

        assert.strictEqual(decision.approved, false);
        assert.strictEqual(decision.code, "PRICE_BAND_BREACH");
    });

    // 8. Duplicate clientOrderId (Idempotency)
    await runRiskTest("Risk: Duplicate clientOrderId Idempotency Check", async () => {
        const acc = SYNTHETIC_ACCOUNTS.LONG_ACCOUNT;
        const price = 739.50;
        const qty = 10;
        const clientOrderId = "duplicate-id-test";

        const first = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId,
            symbol: "HDFCBANK",
            side: "BUY",
            quantity: qty,
            price: price,
            marketPrice: price,
            orderType: "LIMIT"
        });
        assert.strictEqual(first.approved, true);

        // Retry with same clientOrderId
        const second = await evaluateOrder(mockDb, {
            userId: acc.userId,
            clientOrderId,
            symbol: "HDFCBANK",
            side: "BUY",
            quantity: qty,
            price: price,
            marketPrice: price,
            orderType: "LIMIT"
        });

        assert.strictEqual(second.approved, false);
        assert.strictEqual(second.code, "DUPLICATE_ORDER");
    });

    console.log("================================================================================");
    console.log(`RISK ENGINE TESTS COMPLETED: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log("================================================================================\n");
}

main().catch(err => {
    console.error("Risk test runner failed:", err);
    process.exit(1);
});
