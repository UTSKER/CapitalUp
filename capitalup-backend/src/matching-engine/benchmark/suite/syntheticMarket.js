/**
 * syntheticMarket.js
 * 
 * Defines:
 * 1. Fixed Synthetic NSE Equity Universe (Sep-21-2026 reference prices)
 * 2. Deterministic Fake Market Clock (09:15:00 - 15:30:00 IST on 2026-09-21)
 * 3. Seeded Pseudo-Random Number Generator (PRNG) for deterministic stress tests
 */

// 1. SYNTHETIC NSE EQUITY UNIVERSE (Reference prices as of Sep-21-2026)
const NSE_EQUITY_UNIVERSE = {
    RELIANCE: {
        symbol: "RELIANCE",
        name: "Reliance Industries Ltd.",
        referencePrice: 1247.70,
        tickSize: 0.05,
        lotSize: 1,
        minQuantity: 1,
        circuitLimitPct: 0.25 // ±25% risk price band
    },
    TCS: {
        symbol: "TCS",
        name: "Tata Consultancy Services Ltd.",
        referencePrice: 2118.80,
        tickSize: 0.05,
        lotSize: 1,
        minQuantity: 1,
        circuitLimitPct: 0.25
    },
    INFY: {
        symbol: "INFY",
        name: "Infosys Ltd.",
        referencePrice: 1038.50,
        tickSize: 0.05,
        lotSize: 1,
        minQuantity: 1,
        circuitLimitPct: 0.25
    },
    HDFCBANK: {
        symbol: "HDFCBANK",
        name: "HDFC Bank Ltd.",
        referencePrice: 739.50,
        tickSize: 0.05,
        lotSize: 1,
        minQuantity: 1,
        circuitLimitPct: 0.25
    },
    ICICIBANK: {
        symbol: "ICICIBANK",
        name: "ICICI Bank Ltd.",
        referencePrice: 1345.00,
        tickSize: 0.05,
        lotSize: 1,
        minQuantity: 1,
        circuitLimitPct: 0.25
    }
};

// 2. DETERMINISTIC FAKE MARKET CLOCK
class FakeMarketClock {
    constructor(initialTimeStr = "2026-09-21T09:15:00.000+05:30") {
        this.currentTimeMs = new Date(initialTimeStr).getTime();
        this.marketOpenMs = new Date("2026-09-21T09:15:00.000+05:30").getTime();
        this.marketCloseMs = new Date("2026-09-21T15:30:00.000+05:30").getTime();
    }

    now() {
        return this.currentTimeMs;
    }

    date() {
        return new Date(this.currentTimeMs);
    }

    iso() {
        return new Date(this.currentTimeMs).toISOString();
    }

    tick(ms = 1) {
        this.currentTimeMs += ms;
        return this.currentTimeMs;
    }

    isMarketOpen() {
        return this.currentTimeMs >= this.marketOpenMs && this.currentTimeMs <= this.marketCloseMs;
    }

    reset() {
        this.currentTimeMs = this.marketOpenMs;
    }
}

// 3. SEEDED DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR (Mulberry32)
class SeededRandom {
    constructor(seed = 123456789) {
        this.seed = seed;
    }

    next() {
        let t = (this.seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(min, max) {
        return min + this.next() * (max - min);
    }

    intRange(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    choice(array) {
        return array[Math.floor(this.next() * array.length)];
    }
}

// 4. ORDER SIZE PROFILES
const ORDER_SIZE_PROFILES = {
    MICRO: [1, 2, 5, 10],
    SMALL: [25, 50, 100, 500],
    MEDIUM: [1000, 5000, 10000, 50000],
    LARGE: [100000, 500000, 1000000],
    EXTREME: [5000000, 10000000]
};

module.exports = {
    NSE_EQUITY_UNIVERSE,
    FakeMarketClock,
    SeededRandom,
    ORDER_SIZE_PROFILES
};
