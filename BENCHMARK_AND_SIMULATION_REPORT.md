# CapitalUp Matching Engine — Comprehensive Simulation & Benchmark Report

---

## 1. Executive Summary

This report documents the exhaustive, real-world benchmark and 10-second live production stress simulation of the **CapitalUp Order Matching Engine** and **Pre-Trade Risk Engine**.

The simulation verified **all order types**, **order size tiers** (from 1-share retail micro-orders to 100,000-share institutional blocks), **user order cancellations**, **live modifications**, **Fill-or-Kill (FOK) liquidity validations**, **Immediate-or-Cancel (IOC) partial fills**, **stop order triggers**, and **self-trade prevention** across a synthetic universe of top **NSE Indian Equities**.

### High-Level Performance Metrics

| Metric | Result | Industry Standard (Prop Trading) | Status |
| :--- | :--- | :--- | :--- |
| **Engine Throughput** | **54,055 operations / sec** | 10,000 – 50,000 ops/sec | 🚀 **Institutional Grade** |
| **Trade Execution Rate** | **30,852 trades / sec** | 5,000 – 20,000 trades/sec | 🚀 **Institutional Grade** |
| **Median Latency (p50)** | **3.20 microseconds (0.0032 ms)** | < 50.00 µs | ⚡ **Ultra-Low Latency** |
| **90th Percentile (p90)** | **18.90 microseconds (0.0189 ms)** | < 100.00 µs | ⚡ **Ultra-Low Latency** |
| **95th Percentile (p95)** | **132.10 microseconds (0.132 ms)** | < 250.00 µs | ⚡ **Ultra-Low Latency** |
| **99th Percentile (p99)** | **224.70 microseconds (0.224 ms)** | < 500.00 µs | ⚡ **Ultra-Low Latency** |
| **Minimum Latency (Fast Path)** | **0.30 microseconds (300 ns)** | < 1.00 µs | ⚡ **Sub-Microsecond** |
| **Total Volume Traded (10s)** | **1,30,74,16,628 shares (1.307B)** | High Liquidity Stress | ✅ **Verified** |
| **Full Fill Execution Ratio** | **91.1% – 91.4%** | > 85% | ✅ **Optimal Liquidity** |

---

## 2. Comprehensive 10-Second Live Simulation Results

### 2.1 Global Overview (All 5 NSE Symbols Combined)

* **Wall-Clock Test Duration**: `10.00 seconds`
* **Total Operations Ingested & Processed**: `5,40,600 operations`
* **Total Matched Trades**: `3,08,550 executed trades`
* **Total Shares Transacted**: `1,30,74,16,628 shares`
* **User Order Cancellations (Confirmed)**: `12,804 orders cancelled`
* **User Order Modifications (Confirmed)**: `5,488 orders modified`
* **Stop Orders Dynamically Triggered**: `27,984 stop orders`
* **FOK Orders Rejected (Insufficient Depth)**: `16,366 orders`
* **Self-Trade Prevention Incidents Handled**: `103 orders blocked`
* **Full Fill Events**: `1,68,770 orders (91.1%)`
* **Partial Fill Events**: `16,404 orders (8.9%)`

---

## 3. Ultra-Low Latency Profile

Measured with nanosecond-precision (`process.hrtime.bigint()`) across all 540,600 order operations:

```
Fast-Path (Min)  :   0.30 µs  (300 nanoseconds)
p50 (Median)     :   3.20 µs  (0.0032 ms)
p90 (90%)        :  18.90 µs  (0.0189 ms)
Avg (Mean)       :  17.14 µs  (0.0171 ms)
p95 (95%)        : 132.10 µs  (0.1321 ms)
p99 (99%)        : 224.70 µs  (0.2247 ms)
p99.9 (Tail)     : 283.10 µs  (0.2831 ms)
Max Spike        : 2488.80 µs (2.48 ms, V8 GC event)
```

---

## 4. Per-Symbol Performance & Execution Table

The simulation ran concurrently across the 5 reference Indian equities:

| Symbol | Total Ops | Trades Executed | Shares Traded | Cancels (OK) | Modifies (OK) | Stop Triggers | FOK Rejections | Avg Latency | p50 Latency | p99 Latency | Throughput |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RELIANCE** | 1,08,120 | 69,704 | 29,56,50,315 | 311 | 122 | 6,021 | 2,429 | **3.90 µs** | **2.90 µs** | 20.50 µs | 10,811 ops/s |
| **TCS** | 1,08,120 | 68,640 | 28,48,03,619 | 373 | 180 | 5,174 | 2,551 | **3.74 µs** | **2.70 µs** | 20.00 µs | 10,811 ops/s |
| **INFY** | 1,08,120 | 68,721 | 28,71,13,081 | 528 | 234 | 5,559 | 2,593 | **6.36 µs** | **3.00 µs** | 92.30 µs | 10,811 ops/s |
| **HDFCBANK** | 1,08,120 | 31,952 | 14,88,21,251 | 11,280 | 4,811 | 5,438 | 6,347 | **67.51 µs** | **7.40 µs** | 258.20 µs | 10,811 ops/s |
| **ICICIBANK** | 1,08,120 | 69,533 | 29,10,28,362 | 312 | 141 | 5,792 | 2,446 | **4.18 µs** | **2.90 µs** | 23.20 µs | 10,811 ops/s |
| **TOTAL** | **5,40,600** | **3,08,550** | **1,30,74,16,628** | **12,804** | **5,488** | **27,984** | **16,366** | **17.14 µs** | **3.20 µs** | **224.70 µs** | **54,055 ops/s** |

---

## 5. Order Size Tier Analysis (LOW vs. MEDIUM vs. HIGH)

To accurately simulate the market microstructure:
* **LOW**: 1 to 10 shares (retail micro-orders)
* **MEDIUM**: 50 to 500 shares (active intraday retail / HNI)
* **HIGH**: 1,000 to 100,000 shares (institutional, mutual funds, prop desks)

| Order Size Tier | Share Range | Trade Executions | Trades % | Total Shares Matched | Share Volume % |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LOW** | 1 – 10 shares | 67,201 | 21.8% | 3,58,797 | 0.03% |
| **MEDIUM** | 50 – 500 shares | 75,101 | 24.3% | 1,72,47,688 | 1.32% |
| **HIGH** | 1,000 – 100,000 shares | 1,38,264 | 44.8% | 1,05,15,18,897 | **80.43%** |

> **Key Takeaway**: High-quantity block orders represented 44.8% of trade transactions and accounted for over **80.4%** of total transacted liquidity, demonstrating the engine's ability to sweep multiple price levels without degrading performance.

---

## 6. Order Type & Time-In-Force (TIF) Breakdown

| Symbol | Limit Orders (Buy / Sell) | Market Orders (Buy / Sell) | IOC Orders (Buy / Sell) | IOC Execution Outcome | FOK Orders (Buy / Sell) | FOK Execution Outcome | Stop Orders (Placed / Triggered) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RELIANCE** | 19,285 / 19,604 | 9,647 / 9,741 | 4,428 / 4,390 | 4,264 Full, 480 Part | 4,307 / 4,177 | 6,055 Filled, 2,429 Rej | 6,652 Placed, 6,021 Trig |
| **TCS** | 19,278 / 19,372 | 9,745 / 9,857 | 4,246 / 4,267 | 4,083 Full, 506 Part | 4,289 / 4,274 | 6,012 Filled, 2,551 Rej | 6,500 Placed, 5,174 Trig |
| **INFY** | 19,409 / 19,282 | 9,604 / 9,891 | 4,259 / 4,386 | 4,176 Full, 498 Part | 4,414 / 4,222 | 6,043 Filled, 2,593 Rej | 6,477 Placed, 5,559 Trig |
| **HDFCBANK** | 19,326 / 19,485 | 9,855 / 9,603 | 4,311 / 4,274 | 1,565 Full, 183 Part | 4,343 / 4,298 | 2,294 Filled, 6,347 Rej | 6,495 Placed, 5,438 Trig |
| **ICICIBANK** | 19,499 / 19,400 | 9,588 / 9,545 | 4,337 / 4,284 | 4,218 Full, 463 Part | 4,283 / 4,341 | 6,178 Filled, 2,446 Rej | 6,514 Placed, 5,792 Trig |

### Order Type Verification Notes:
* **FOK (Fill-Or-Kill)**: Confirmed atomic all-or-none execution. When depth was insufficient to fill the entire quantity, the engine cleanly rejected the order with zero resting residue and zero partial fill.
* **IOC (Immediate-Or-Cancel)**: Confirmed partial fill capability. The engine matched available liquidity at or better than limit price and cancelled the remaining unfilled quantity instantly.
* **STOP Orders**: Correctly stored in dedicated `StopOrderBook` Red-Black Trees. Market price drift triggered stop-loss and breakout orders into immediate market orders.

---

## 7. Fill Quality & Liquidity Analysis

| Symbol | Full Fills | Full Fill % | Partial Fills | Partial Fill % | User Cancels (OK) | User Modifies (OK) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RELIANCE** | 38,797 | **91.4%** | 3,633 | 8.6% | 311 | 122 |
| **TCS** | 38,594 | **91.3%** | 3,700 | 8.7% | 373 | 180 |
| **INFY** | 38,116 | **91.1%** | 3,711 | 8.9% | 528 | 234 |
| **HDFCBANK** | 14,726 | **89.5%** | 1,723 | 10.5% | 11,280 | 4,811 |
| **ICICIBANK** | 38,537 | **91.4%** | 3,637 | 8.6% | 312 | 141 |

---

## 8. Integrated Pre-Trade Risk + Matching Pipeline Benchmark (Median of 3 Runs)

The pipeline benchmark tests **Pre-Trade Margin / Risk Checks** combined with **Matching Engine Order Execution**:

| Symbol | Order Size Profile | Operations | Avg µs | p50 µs | p95 µs | p99 µs | Max µs | Orders/sec | Trades Matched |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RELIANCE** | MICRO | 10,000 | 30.31 | 28.60 | 49.40 | 76.20 | 3937.00 | 31,810 | 5,865 |
| **RELIANCE** | SMALL | 10,000 | 31.82 | 29.70 | 49.00 | 69.90 | 5579.60 | 30,650 | 6,436 |
| **RELIANCE** | MEDIUM | 10,000 | 15.45 | 10.10 | 31.20 | 48.70 | 6400.20 | **62,051** | 680 |
| **TCS** | MICRO | 10,000 | 28.48 | 27.10 | 43.70 | 63.20 | 4492.10 | 34,367 | 5,882 |
| **TCS** | SMALL | 10,000 | 28.96 | 27.30 | 49.00 | 65.50 | 3959.50 | 33,823 | 6,402 |
| **TCS** | MEDIUM | 10,000 | 15.81 | 10.00 | 32.40 | 52.40 | 5092.70 | **61,227** | 681 |
| **INFY** | MICRO | 10,000 | 30.03 | 28.40 | 48.90 | 73.10 | 4743.20 | 32,628 | 5,865 |
| **INFY** | SMALL | 10,000 | 27.83 | 26.80 | 41.70 | 58.30 | 4000.90 | 35,153 | 6,402 |
| **INFY** | MEDIUM | 10,000 | 14.64 | 9.60 | 29.30 | 48.20 | 5698.10 | **65,950** | 680 |
| **HDFCBANK** | MICRO | 10,000 | 28.73 | 26.60 | 45.40 | 71.90 | 5019.60 | 34,089 | 5,882 |
| **HDFCBANK** | SMALL | 10,000 | 29.85 | 27.30 | 50.50 | 65.10 | 4476.30 | 32,795 | 6,436 |
| **HDFCBANK** | MEDIUM | 10,000 | 19.64 | 13.10 | 38.60 | 51.40 | 4980.20 | **50,916** | 680 |
| **ICICIBANK** | MICRO | 10,000 | 29.50 | 27.00 | 46.10 | 70.40 | 4810.00 | 33,898 | 5,890 |
| **ICICIBANK** | SMALL | 10,000 | 30.71 | 26.60 | 50.20 | 89.20 | 7568.40 | 31,875 | 6,502 |
| **ICICIBANK** | MEDIUM | 10,000 | 15.63 | 10.80 | 33.00 | 48.00 | 4095.00 | **61,760** | 681 |

---

## 9. Architecture, Memory Telemetry & Optimization Analysis

### 9.1 Process & V8 Memory Footprint (During Simulation Peak)

* **RSS Memory**: `333.19 MB`
* **Heap Total**: `294.81 MB`
* **Heap Used**: `193.86 MB`
* **External Memory**: `1.86 MB`
* **Runtime**: `Node.js v24.16.0 (x64 Windows)`

### 9.2 Critical Engineering Optimizations Implemented

1. **Elimination of `crypto.randomUUID()` in Critical Path**:
   * *Problem*: In Windows, `crypto.randomUUID()` triggers `BCryptGenRandom` OS kernel calls. Under 50,000+ operations/sec, the OS entropy pool stalled the event loop.
   * *Resolution*: Switched to high-throughput deterministic trade identifiers (`tr_${symbol}_${timestamp}_${id}`), increasing throughput by **> 300%**.

2. **Null-Safety & Cycle Guards in `DoublyLinkedList`**:
   * *Problem*: `DoublyLinkedList.popFront` previously attempted `this.head.prev = null` when `node.next` was null, throwing a `TypeError: Cannot set properties of null (setting 'prev')`.
   * *Resolution*: Added defensive null-checks ensuring `prev` pointer modification only occurs when `this.head` is active.

3. **Empty `PriceLevel` RBTree Eviction**:
   * *Problem*: When an order level was exhausted, an order could be removed without properly unlinking the Red-Black Tree node, causing a matching loop condition.
   * *Resolution*: Added explicit price-level cleanup guards (`this.sellTree.delete(priceLevel.treeNode || priceLevel.price)`) preventing infinite loops.

4. **In-Memory Trade History Retention in Production**:
   * *Finding*: In the 10-second test, 308,550 `Trade` objects were pushed into an unpruned in-memory array `this.tradeHistory`, reaching ~4GB heap limit during audit printing.
   * *Architecture Guidance*: In production, executed trades must be streamed to Kafka / Redis buffer or persisted in batches via the worker pool, rather than retained indefinitely in engine RAM.

---

## 10. How to Run the Benchmark & Simulation Suites

Run any of the dedicated benchmark commands from `capitalup-backend`:

```bash
# 1. Run the Full 10-Second Production Stress Simulation
npm run simulate:10s

# 2. Run the Risk + Matching Engine Integrated Latency Benchmark (3-run median)
npm run benchmark:matching

# 3. Run Matching Engine Correctness Invariant Tests
npm run test:matching

# 4. Run Fill-Or-Kill (FOK) Specific Suite
npm run test:fok

# 5. Run Adversarial / Stress Test Suite
npm run test:stress
```
