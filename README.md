# CapitalUp

CapitalUp is an institutional-grade Wealth Management, Portfolio Analytics, and Ultra-Low-Latency Paper Trading platform. It provides high-net-worth investors and quantitative portfolio managers with sophisticated financial analytics, trading utilities, real-time market data streaming, and an in-memory limit order matching engine.

The platform is structured with a modular, clean-architecture backend powered by Node.js and Express, alongside an optimized React Vite frontend styled with the Shadcn/Tailwind design system.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [High-Performance Order Matching Engine](#high-performance-order-matching-engine)
   - [Architectural Design & Data Structures](#architectural-design--data-structures)
   - [Supported Order Types & Time-in-Force](#supported-order-types--time-in-force)
   - [Order Size Tiers & Market Microstructure](#order-size-tiers--market-microstructure)
   - [Testing & Benchmarking Suite](#testing--benchmarking-suite)
   - [Benchmark & Telemetry Results](#benchmark--telemetry-results)
3. [Codebase Architecture & Directory Structure](#codebase-architecture--directory-structure)
   - [Backend Architecture (`capitalup-backend`)](#backend-architecture-capitalup-backend)
   - [Frontend Architecture (`frontend`)](#frontend-architecture-frontend)
4. [Technology Stack](#technology-stack)
5. [Getting Started & Local Setup](#getting-started--local-setup)
   - [Prerequisites](#prerequisites)
   - [Backend Installation & Running](#backend-installation--running)
   - [Frontend Setup & Environment Configuration](#frontend-setup--environment-configuration)
6. [Architecture & Technical Documentation Guides](#architecture--technical-documentation-guides)
7. [Contributing & License](#contributing--license)

---

## Project Overview

CapitalUp delivers an institutional-grade financial trading and portfolio analytics experience. The platform incorporates:
- **In-Memory Order Matching Engine**: Operating with sub-3.2 microsecond median latency and throughput exceeding 54,000 operations per second.
- **Pre-Trade Risk Engine**: Validating cash margin, unreserved holdings, price bands (±25%), and maximum order caps before routing.
- **Multi-Asset Portfolio Analytics**: Providing real-time calculation of realized/unrealized PnL, cash reserves, and asset allocations.
- **AI Financial Copilot**: RAG-powered financial intelligence utilizing local knowledge vectors, embeddings, and semantic search.

---

## High-Performance Order Matching Engine

The core matching engine is located in [`capitalup-backend/src/matching-engine/`](capitalup-backend/src/matching-engine/) and is architected specifically for low-latency, deterministic execution.

### Architectural Design & Data Structures

```
                      ┌────────────────────────────────────────┐
                      │        INCOMING ORDER PAYLOAD          │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │    PRE-TRADE RISK ENGINE CONTROLS      │
                      │  • Cash Margin  • Collateral Locks     │
                      │  • Price Bands  • Idempotency Check    │
                      └──────────────────┬─────────────────────┘
                                         │ Approved
                                         ▼
                      ┌────────────────────────────────────────┐
                      │     PER-SYMBOL SEQUENCER / QUEUE       │
                      │   (Deterministic Single-Writer FIFO)   │
                      └──────────────────┬─────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
      ┌───────────────────────────┐             ┌───────────────────────────┐
      │     BID BOOK (BUY)        │             │     ASK BOOK (SELL)       │
      │  Red-Black Tree: Max Heap │             │  Red-Black Tree: Min Heap │
      │  O(log M) Price Levels    │             │  O(log M) Price Levels    │
      └─────────────┬─────────────┘             └─────────────┬─────────────┘
                    │                                         │
                    ▼                                         ▼
      ┌───────────────────────────┐             ┌───────────────────────────┐
      │    PriceLevel Orders      │             │    PriceLevel Orders      │
      │  Doubly-Linked List: FIFO │             │  Doubly-Linked List: FIFO │
      │     O(1) Time Priority    │             │     O(1) Time Priority    │
      └───────────────────────────┘             └───────────────────────────┘
```

1. **Price Priority ($O(\log M)$)**: Red-Black self-balancing binary search tree indexed by price ticks (multiplied by 100 to eliminate floating-point imprecision).
   - Best Bid = Maximum node in Buy Tree.
   - Best Ask = Minimum node in Sell Tree.
2. **Time Priority ($O(1)$)**: Each price level maintains an intrusive Doubly-Linked List (`DoublyLinkedList`) ensuring exact FIFO matching for orders queued at identical prices.
3. **Direct Order Lookup & Cancellation ($O(1)$)**: An in-memory hash map (`orderIndex`) directly references `OrderNode` instances, enabling constant-time removals and priority-preserving size reductions without traversing the book.
4. **Per-Symbol Concurrency**: Each equity symbol operates its own dedicated promise-based sequential queue, eliminating multi-threading locking contention while enabling parallel processing across non-overlapping stocks (`RELIANCE`, `TCS`, `INFY`, etc.).

### Supported Order Types & Time-in-Force

| Order Type | Behavior & Execution Semantics |
| :--- | :--- |
| **LIMIT** | Rests on the book if non-crossing (Maker). Matches immediately against resting counterparty orders if crossing (Taker). Price-time priority preserved. |
| **MARKET** | Aggressive taker order that sweeps existing liquidity on the counterparty side up to available depth. Any unfulfilled remainder is immediately cancelled. |
| **IOC** *(Immediate-Or-Cancel)* | Fills as much quantity as possible at or better than the specified limit price. Any unfilled remainder is immediately cancelled without resting on the book. |
| **FOK** *(Fill-Or-Kill)* | Strictly all-or-none. Evaluates cumulative book depth in a single atomic pre-trade scan. If full quantity cannot be filled, the order is rejected with zero trades and zero book state mutations. |
| **STOP / STOP-LIMIT** | Maintained in an isolated `StopOrderBook`. When market prices cross the designated stop price, the stop order automatically triggers and routes into the active book. |
| **OCO** *(One-Cancels-the-Other)* | Pairs a profit-taking Limit order with a loss-mitigating Stop order. Execution of the limit leg atomically cancels the stop leg, and vice-versa. |
| **STP** *(Self-Trade Prevention)* | Enforces `CANCEL_NEW` policy when both Maker and Taker share the same account or user ID, preventing wash sales. |

### Order Size Tiers & Market Microstructure

- **LOW Tier (1 – 10 shares)**: Retail odd-lot orders.
- **MEDIUM Tier (50 – 500 shares)**: Standard active retail and swing-trader orders.
- **HIGH Tier (1,000 – 100,000 shares)**: Institutional block and sweep liquidity orders.

---

### Testing & Benchmarking Suite

All matching engine tests, risk validation suites, and benchmarks can be run directly from the `capitalup-backend` directory.

#### 1. Navigate to the Backend Folder
```bash
cd capitalup-backend
```

#### 2. Core Correctness & Invariant Test Suite
Validates FIFO queue precedence, partial fills, multi-level price sweeps, race conditions (Place vs Cancel vs Match), order modifications, stop triggers, OCO cancellation, and Self-Trade Prevention across 11 test scenarios.
```bash
npm run test:matching
```

#### 3. Pre-Trade Risk Engine Validation
Validates pre-trade margin checks, unreserved equity holdings, price collar violation rejections (±25%), maximum quantity/notional limits, and idempotency checks.
```bash
npm run test:risk
```

#### 4. Fill-Or-Kill (FOK) Atomic Deep Test Suite
Runs comprehensive all-or-none tests across scale profiles (from 1 share to 1,000,000 shares), validating zero residual liquidity leaks and atomic rollbacks when depth is insufficient by even 1 share.
```bash
npm run test:fok
```

#### 5. Adversarial Stress & Chaos Test Suite
Subjects the engine to extreme edge cases: rapid order add/cancel churn (5,000 orders), deep FIFO queue pressure (2,500 orders at identical prices), wide trees (2,000 distinct price levels), and PRNG storm simulation.
```bash
npm run test:stress
```

#### 6. Comprehensive Engine 25-Point Test Suite
Runs the full suite of 25 end-to-end scenarios covering multi-symbol isolation (`RELIANCE.NS`, `TCS.NS`, `INFY.NS`), price precision decimals, and concurrent operations.
```bash
npm run test:engine
```

#### 7. Microsecond Pipeline Latency Benchmark (3-Run Median)
Executes a 10,000-order pipeline benchmark per symbol across MICRO, SMALL, and MEDIUM profiles after V8 JIT warmup, reporting p50, p95, p99, and maximum latency percentiles.
```bash
npm run benchmark:matching
```

#### 8. Full 10-Second High-Concurrency Production Simulation
Simulates continuous multi-participant market flow for 10 seconds across 5 major NSE stocks, generating over 540,000 operations, 308,000 trades, stop triggers, and real-time cancellations.
```bash
npm run simulate:10s
```

---

### Benchmark & Telemetry Results

Empirical results captured on a standard development workstation (Node.js v24 V8 Runtime, Windows x64):

| Metric | Measured Benchmark Value |
| :--- | :--- |
| **Total Operations Executed** | **540,600 ops** (in 10.00 seconds) |
| **Sustained Throughput** | **54,055 operations / second** |
| **Total Executed Trades** | **308,550 trades** |
| **Total Shares Transacted** | **1,307,030,229 shares** (~₹1.32 Trillion notional) |
| **p50 (Median Latency)** | **3.19 µs** (sub-4 microseconds) |
| **p95 Latency** | **5.64 µs** |
| **p99 Latency** | **10.87 µs** |
| **Maximum Tail Latency** | **688.16 µs** (during extreme multi-tier sweeps) |
| **Heap Memory Consumed** | **156.44 MB** (RSS: 355 MB) |
| **Invariant Violations** | **0 (Zero)** |

Detailed empirical tables, distribution charts, and per-symbol telemetry are available in [`BENCHMARK_AND_SIMULATION_REPORT.md`](BENCHMARK_AND_SIMULATION_REPORT.md).

---

## Codebase Architecture & Directory Structure

The repository follows a clean, modular structure:

```
CapitalUp/
├── BENCHMARK_AND_SIMULATION_REPORT.md             # Empirical 10-second simulation & benchmark metrics
├── MATCHING_ENGINE_RESUME_AND_ARCHITECTURE_GUIDE.md # Quantitative finance architecture guide & interview defense
├── ORDER_MATCHING_ENGINE_ARCHITECTURE.md          # Technical engine design specification
├── capitalup-backend/                             # Express & Node.js API backend
│   ├── src/
│   │   ├── config/                                # Database (Postgres) & Cache (Redis) configs
│   │   ├── database/                              # Prisma schema & SQL migrations
│   │   ├── matching-engine/                       # Core Order Matching Engine
│   │   │   ├── core/                              # OrderBook, OrderNode, PriceLevel, Trade, StopOrderBook
│   │   │   ├── datastructures/                    # RedBlackTree, DoublyLinkedList
│   │   │   ├── engine/                            # MatchingEngine coordinator, SymbolQueue, OCO manager
│   │   │   ├── benchmark/                         # Simulation runners & synthetic market generators
│   │   │   └── test/                              # Comprehensive test suites
│   │   ├── middlewares/                           # JWT auth, Joi validation, error handlers
│   │   └── modules/                               # Domain services (auth, portfolio, risk, AI copilot)
│   └── package.json                               # Backend dependency & test command definitions
└── frontend/                                      # React Vite frontend distribution
    ├── dist/                                      # Optimized production static assets
    ├── default_shadcn_theme.css                   # Global Shadcn CSS design system variables
    └── index.html                                 # Single Page Application entrypoint
```

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Matching Engine** | Pure JavaScript (ES6+ / V8 Optimized) | Lock-free, zero-dependency in-memory matching engine with Red-Black Tree + FIFO queues |
| **Backend Core** | Node.js (v18+) & Express v5 | RESTful API transport, routing, and lifecycle management |
| **Database & ORM** | PostgreSQL & Prisma ORM | Relational persistence for user portfolios, balances, and historical orders |
| **Caching Layer** | Redis | In-memory query acceleration, session management, and pub/sub |
| **AI Copilot** | LangChain, HuggingFace, Groq, Qdrant | Retrieval-augmented generation (RAG) for financial analytics and guidance |
| **Frontend** | React, Vite, Shadcn UI, CSS Variables | High-performance user interface with dark/light themes and responsive components |

---

## Getting Started & Local Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Git**: For source version control
- *(Optional)* **PostgreSQL** & **Redis** for database persistence and caching features.

---

### Backend Installation & Running

1. Clone repository and navigate to the backend directory:
   ```bash
   cd capitalup-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` (if present) and configure your database and port settings.

4. Run all matching engine verification tests:
   ```bash
   npm run test:matching
   npm run test:risk
   npm run test:fok
   npm run test:stress
   ```

5. Start the backend API server in development mode:
   ```bash
   npm run dev
   ```

---

### Frontend Setup & Environment Configuration

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Serve static distribution files:
   ```bash
   npx serve dist
   ```

3. For frontend development mode:
   ```bash
   npm install
   npm run dev
   ```

---

## Architecture & Technical Documentation Guides

For in-depth explanations, resume bullet points, interview preparation, and performance analysis, refer to:

- [`MATCHING_ENGINE_RESUME_AND_ARCHITECTURE_GUIDE.md`](MATCHING_ENGINE_RESUME_AND_ARCHITECTURE_GUIDE.md): Complete quantitative finance resume guide, interview Q&A defense scripts, low-level OS/hardware mechanics (L1/L2/L3 cache misses, context switching, memory barriers), and architectural roadmap (C++20, DPDK, Solarflare OpenOnload).
- [`BENCHMARK_AND_SIMULATION_REPORT.md`](BENCHMARK_AND_SIMULATION_REPORT.md): Complete empirical latency percentiles (p50, p95, p99), per-symbol distribution breakdown, and throughput analysis across 540,000+ operations.
- [`ORDER_MATCHING_ENGINE_ARCHITECTURE.md`](ORDER_MATCHING_ENGINE_ARCHITECTURE.md): Deep-dive into internal data structures, sequence flows, and time complexities.

---

## Contributing & License

1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feature/matching-engine-enhancement
   ```
2. Run the test suite before submitting:
   ```bash
   npm run test:matching && npm run test:engine
   ```
3. Commit your changes:
   ```bash
   git commit -m "feat: optimize tree node rebalancing"
   ```
4. Push to origin and open a Pull Request.

**License**: ISC License.