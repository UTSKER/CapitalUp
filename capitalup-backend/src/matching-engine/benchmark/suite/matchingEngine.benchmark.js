/**
 * matchingEngine.benchmark.js
 * 
 * Comprehensive High-Throughput & Ultra-Low-Latency Benchmark Suite for:
 *        [ Pre-Trade Risk Engine ]  --->  [ Order Matching Engine ]
 * 
 * Characteristics:
 * - Uses high-precision `process.hrtime.bigint()` for nanosecond/microsecond accuracy
 * - Synthetic NSE Equity Universe: RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK
 * - Configurable Profiles: MICRO, SMALL, MEDIUM, LARGE
 * - Configurable Workloads: LIMIT_HEAVY, MARKET_HEAVY, FOK_HEAVY, ADVERSARIAL, RISK_HEAVY
 * - Multi-run support (Run 1, Run 2, Run 3 -> Median calculation) with warm-up cycle
 * - Measures separate stages: Risk Latency, Matching Latency, Total Pipeline Latency
 * - Memory telemetry: RSS, HeapUsed, HeapTotal
 */

process.env.RISK_ORDERS_PER_MINUTE = "100000000";
const assert = require("assert");
const MatchingEngine = require("../../engine/MatchingEngine");
const { evaluateOrder } = require("../../../modules/risk/services/risk.service");
const { NSE_EQUITY_UNIVERSE, FakeMarketClock, SeededRandom, ORDER_SIZE_PROFILES } = require("./syntheticMarket");
const { SYNTHETIC_ACCOUNTS, MockRiskDatabase } = require("./syntheticAccounts");

const WORKLOAD_MIXES = {
    LIMIT_HEAVY: { limit: 0.70, market: 0.10, cancel: 0.10, ioc: 0.05, fok: 0.05 },
    MARKET_HEAVY: { limit: 0.40, market: 0.40, cancel: 0.10, ioc: 0.10, fok: 0.00 },
    FOK_HEAVY: { limit: 0.30, market: 0.10, cancel: 0.10, ioc: 0.20, fok: 0.30 },
    ADVERSARIAL: { limit: 0.30, market: 0.20, cancel: 0.20, ioc: 0.10, fok: 0.10 },
    RISK_HEAVY: { limit: 0.50, market: 0.00, cancel: 0.00, ioc: 0.00, fok: 0.00, riskInvalid: 0.50 }
};

/**
 * Runs a single benchmark iteration
 */
async function runSingleBenchmark(engine, mockDb, symbol, profileName, count, workloadMix, seed) {
    const rng = new SeededRandom(seed);
    const clock = new FakeMarketClock();
    const universeMeta = NSE_EQUITY_UNIVERSE[symbol];
    const basePrice = universeMeta.referencePrice;
    const sizes = ORDER_SIZE_PROFILES[profileName] || ORDER_SIZE_PROFILES.SMALL;

    // Populate initial resting book depth
    for (let i = 1; i <= 30; i++) {
        const askP = Number((basePrice + i * 0.10).toFixed(2));
        const bidP = Number((basePrice - i * 0.10).toFixed(2));
        engine.placeOrder({ id: `seed-ask-${i}`, userId: "mm-1", symbol, side: "SELL", quantity: 500, limitPrice: askP });
        engine.placeOrder({ id: `seed-bid-${i}`, userId: "mm-2", symbol, side: "BUY", quantity: 500, limitPrice: bidP });
    }

    const activeOrderIds = [];
    const riskLatenciesNs = [];
    const matchingLatenciesNs = [];
    const totalLatenciesNs = [];

    let totalTrades = 0;
    let totalCancelled = 0;
    let totalRiskRejected = 0;
    let totalFokChecks = 0;
    let totalQuantityMatched = 0;

    const pipelineStart = process.hrtime.bigint();

    for (let i = 0; i < count; i++) {
        const opId = `op-${profileName}-${i}`;
        const roll = rng.next();
        const side = rng.next() > 0.5 ? "BUY" : "SELL";
        const qty = sizes[i % sizes.length];

        // Check if this iteration tests intentional risk rejection
        const isIntentionalRiskInvalid = workloadMix.riskInvalid && rng.next() < workloadMix.riskInvalid;

        let limitPrice = basePrice;
        let orderType = "LIMIT";
        let tif = "DAY";
        let isCancel = false;

        if (isIntentionalRiskInvalid) {
            // Price outside permissible 25% band
            limitPrice = Number((basePrice * 1.50).toFixed(2));
        } else if (roll < workloadMix.limit) {
            orderType = "LIMIT";
            const offset = (rng.intRange(-10, 10)) * 0.05;
            limitPrice = Number((basePrice + offset).toFixed(2));
        } else if (roll < (workloadMix.limit + workloadMix.market)) {
            orderType = "MARKET";
        } else if (roll < (workloadMix.limit + workloadMix.market + workloadMix.fok)) {
            tif = "FOK";
            totalFokChecks++;
            const offset = (rng.intRange(-2, 2)) * 0.05;
            limitPrice = Number((basePrice + offset).toFixed(2));
        } else if (roll < (workloadMix.limit + workloadMix.market + workloadMix.fok + workloadMix.ioc)) {
            tif = "IOC";
        } else if (activeOrderIds.length > 0) {
            isCancel = true;
        }

        const t0 = process.hrtime.bigint();

        if (isCancel) {
            const targetId = activeOrderIds.pop();
            engine.cancelOrder(symbol, targetId);
            totalCancelled++;
            const tTotal = process.hrtime.bigint() - t0;
            totalLatenciesNs.push(tTotal);
            continue;
        }

        // 1. Stage A: Pre-Trade Risk Engine Validation
        const tRisk0 = process.hrtime.bigint();
        const decision = await evaluateOrder(mockDb, {
            userId: SYNTHETIC_ACCOUNTS.MARKET_MAKER.userId,
            clientOrderId: opId,
            symbol,
            side,
            quantity: qty,
            price: limitPrice,
            marketPrice: basePrice,
            orderType
        });
        const tRisk1 = process.hrtime.bigint();
        riskLatenciesNs.push(tRisk1 - tRisk0);

        if (!decision.approved) {
            totalRiskRejected++;
            totalLatenciesNs.push(tRisk1 - t0);
            continue; // Must NOT reach matching engine!
        }

        // 2. Stage B: Order Matching Engine Execution
        const tMatch0 = process.hrtime.bigint();
        const matchRes = engine.placeOrder({
            id: opId,
            userId: `trader-${i % 500}`,
            symbol,
            side,
            quantity: qty,
            limitPrice: orderType === "MARKET" ? null : limitPrice,
            orderType,
            timeInForce: tif,
            createdAt: clock.now()
        });
        const tMatch1 = process.hrtime.bigint();
        matchingLatenciesNs.push(tMatch1 - tMatch0);

        const tTotal = tMatch1 - t0;
        totalLatenciesNs.push(tTotal);

        if (matchRes.remainingOrder) {
            activeOrderIds.push(opId);
        }
        if (matchRes.trades && matchRes.trades.length > 0) {
            totalTrades += matchRes.trades.length;
            for (const tr of matchRes.trades) {
                totalQuantityMatched += tr.executedQuantity;
            }
        }
    }

    const pipelineEnd = process.hrtime.bigint();
    const durationMs = Number(pipelineEnd - pipelineStart) / 1e6;

    // Convert nanoseconds to microseconds (µs)
    const toUs = (nsArr) => nsArr.map(n => Number(n) / 1000).sort((a, b) => a - b);
    const sortedTotalUs = toUs(totalLatenciesNs);
    const sortedMatchUs = toUs(matchingLatenciesNs);
    const sortedRiskUs = toUs(riskLatenciesNs);

    const percentile = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
        symbol,
        profileName,
        totalOrders: count,
        durationMs,
        ordersPerSec: Math.round((count / (durationMs / 1000))),
        tradesPerSec: Math.round((totalTrades / (durationMs / 1000))),
        totalTrades,
        totalQuantityMatched,
        totalRiskRejected,
        totalCancelled,
        totalFokChecks,
        latency: {
            total: {
                avg: avg(sortedTotalUs),
                p50: percentile(sortedTotalUs, 0.50),
                p95: percentile(sortedTotalUs, 0.95),
                p99: percentile(sortedTotalUs, 0.99),
                p999: percentile(sortedTotalUs, 0.999),
                min: sortedTotalUs[0],
                max: sortedTotalUs[sortedTotalUs.length - 1]
            },
            matchingOnly: {
                avg: avg(sortedMatchUs),
                p50: percentile(sortedMatchUs, 0.50),
                p95: percentile(sortedMatchUs, 0.95),
                p99: percentile(sortedMatchUs, 0.99)
            },
            riskOnly: {
                avg: avg(sortedRiskUs),
                p50: percentile(sortedRiskUs, 0.50),
                p95: percentile(sortedRiskUs, 0.95)
            }
        }
    };
}

async function main() {
    console.log("================================================================================");
    console.log("    CAPITALUP BENCHMARK: PRE-TRADE RISK + MATCHING ENGINE PIPELINE              ");
    console.log("================================================================================");

    const mockDb = new MockRiskDatabase();
    const symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"];
    const profiles = ["MICRO", "SMALL", "MEDIUM"];
    const opsCount = 10000; // 10,000 operations per scenario

    console.log("\n[Warmup Phase] Warming up V8 JIT compiler & RB-Trees (10,000 discarded ops)...");
    const warmupEngine = new MatchingEngine();
    await runSingleBenchmark(warmupEngine, mockDb, "RELIANCE", "SMALL", 10000, WORKLOAD_MIXES.LIMIT_HEAVY, 999);
    console.log("  ✓ Warmup complete. Beginning measured benchmark runs...\n");

    const benchmarkResultsTable = [];

    for (const sym of symbols) {
        for (const prof of profiles) {
            const runs = [];
            // Execute 3 runs to determine median
            for (let r = 1; r <= 3; r++) {
                const engine = new MatchingEngine();
                mockDb.reset();
                const res = await runSingleBenchmark(engine, mockDb, sym, prof, opsCount, WORKLOAD_MIXES.LIMIT_HEAVY, 100 + r);
                runs.push(res);
            }

            // Pick median run by ordersPerSec
            runs.sort((a, b) => a.ordersPerSec - b.ordersPerSec);
            const medianRun = runs[1];

            benchmarkResultsTable.push({
                Symbol: medianRun.symbol,
                Profile: medianRun.profileName,
                Orders: medianRun.totalOrders.toLocaleString(),
                "Avg µs": medianRun.latency.total.avg.toFixed(2),
                "p50 µs": medianRun.latency.total.p50.toFixed(2),
                "p95 µs": medianRun.latency.total.p95.toFixed(2),
                "p99 µs": medianRun.latency.total.p99.toFixed(2),
                "Max µs": medianRun.latency.total.max.toFixed(2),
                "Orders/s": medianRun.ordersPerSec.toLocaleString(),
                Trades: medianRun.totalTrades.toLocaleString()
            });
        }
    }

    console.log("================================================================================");
    console.log("               BENCHMARK RESULT TABLE (MEDIAN OF 3 RUNS)                        ");
    console.log("================================================================================");
    console.table(benchmarkResultsTable);

    // Memory & Telemetry Telemetry
    const mem = process.memoryUsage();
    console.log("\n---------------- MEMORY & TELEMETRY USAGE ----------------");
    console.log(`  RSS Memory        : ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used         : ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Total        : ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  External Memory   : ${(mem.external / 1024 / 1024).toFixed(2)} MB`);
    console.log("================================================================================\n");
}

main().catch(err => {
    console.error("Benchmark runner failed:", err);
    process.exit(1);
});
