/**
 * run_simulation_and_benchmark.js
 * 
 * Master runner combining:
 * 1. Multi-symbol fake resting order generation across price levels
 * 2. Incoming BUY order simulation (Crossing Limit, FOK, Market, Non-crossing)
 * 3. Functional correctness and invariant validation
 * 4. High-precision throughput benchmarking (Orders per second & latency distribution)
 */

const MatchingEngine = require("../engine/MatchingEngine");
const { populateRestingOrders, DEFAULT_SYMBOLS_CONFIG } = require("./populate_orders");
const { runCorrectnessValidation, runThroughputBenchmark } = require("./execute_buy_orders");

function main() {
    console.log("================================================================================");
    console.log("       CAPITALUP MATCHING ENGINE - SIMULATION & PERFORMANCE BENCHMARK           ");
    console.log("================================================================================");

    const engine = new MatchingEngine();

    console.log("\n[STAGE 1] Populating fake resting orders across symbols & price levels...");
    const popStats = populateRestingOrders(engine, DEFAULT_SYMBOLS_CONFIG, { ordersMultiplier: 4 });

    console.log(`\n  ✓ Generated ${popStats.totalOrdersAdded.toLocaleString()} resting orders across ${DEFAULT_SYMBOLS_CONFIG.length} symbols in ${popStats.durationMs}ms`);
    console.log(`  ✓ Initial ingestion speed: ${popStats.ratePerSec.toLocaleString()} orders/sec\n`);

    console.table(Object.entries(popStats.statsBySymbol).map(([symbol, stat]) => ({
        Symbol: symbol,
        "Resting Orders": stat.ordersAdded.toLocaleString(),
        "Total Shares": stat.totalQuantity.toLocaleString(),
        "Best Bid (₹)": stat.bestBid ? stat.bestBid.toFixed(2) : "None",
        "Best Ask (₹)": stat.bestAsk ? stat.bestAsk.toFixed(2) : "None",
        "Book Depth": stat.totalActiveOrders.toLocaleString()
    })));

    console.log("\n[STAGE 2] Running correctness tests on incoming BUY orders...");
    runCorrectnessValidation(engine);

    console.log("\n[STAGE 3] Running high-throughput burst benchmark...");
    const orderCount = process.env.ORDER_COUNT ? parseInt(process.env.ORDER_COUNT, 10) : 30000;
    const benchResults = runThroughputBenchmark(engine, orderCount);

    console.log("================================================================================");
    console.log("                        FINAL BENCHMARK SUMMARY                                 ");
    console.log("================================================================================");
    console.log(`  ✓ Operational Status    : ALL TESTS & INVARIANTS PASSED`);
    console.log(`  ✓ Throughput Measured   : ${benchResults.ordersPerSec.toLocaleString()} orders/sec`);
    console.log(`  ✓ Trades Generated      : ${benchResults.tradesPerSec.toLocaleString()} trades/sec`);
    console.log(`  ✓ p50 Latency (Median)  : ${benchResults.p50LatencyUs.toFixed(2)} µs`);
    console.log(`  ✓ p95 Latency           : ${benchResults.p95LatencyUs.toFixed(2)} µs`);
    console.log(`  ✓ p99 Latency           : ${benchResults.p99LatencyUs.toFixed(2)} µs`);
    console.log("================================================================================\n");
}

main();
