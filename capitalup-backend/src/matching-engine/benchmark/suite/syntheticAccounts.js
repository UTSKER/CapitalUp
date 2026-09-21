/**
 * syntheticAccounts.js
 * 
 * Provides:
 * 1. Pre-configured Synthetic Account Types (LONG_ACCOUNT, SHORT_ACCOUNT, etc.)
 * 2. Ultra-fast In-Memory Mock Database for Risk Engine Pre-Trade Evaluation
 * 3. In-Memory Mock Redis for Rate Limiting without network calls
 */

const { NSE_EQUITY_UNIVERSE } = require("./syntheticMarket");

// 1. SYNTHETIC ACCOUNT DEFINITIONS
const SYNTHETIC_ACCOUNTS = {
    LONG_ACCOUNT: {
        userId: "acc-long-01",
        name: "Long Investor Account",
        cashBalance: 5000000.00, // ₹50 Lakhs
        holdings: {
            RELIANCE: 1000,
            TCS: 500,
            INFY: 2000,
            HDFCBANK: 3000,
            ICICIBANK: 1500
        },
        shortPosition: {},
        margin: 1.0,
        maxOrderQuantity: 100000,
        maxOrderValue: 5000000,
        maxPosition: 250000
    },
    SHORT_ACCOUNT: {
        userId: "acc-short-01",
        name: "Short Selling Account",
        cashBalance: 10000000.00, // ₹1 Crore
        holdings: {
            RELIANCE: 500,
            TCS: 200,
            INFY: 500
        },
        shortPosition: {
            HDFCBANK: 1000,
            ICICIBANK: 800
        },
        margin: 2.0,
        maxOrderQuantity: 100000,
        maxOrderValue: 5000000,
        maxPosition: 250000
    },
    MARKET_MAKER: {
        userId: "acc-mm-01",
        name: "Institutional Market Maker",
        cashBalance: 500000000.00, // ₹50 Crores
        holdings: {
            RELIANCE: 100000,
            TCS: 100000,
            INFY: 100000,
            HDFCBANK: 100000,
            ICICIBANK: 100000
        },
        shortPosition: {},
        margin: 5.0,
        maxOrderQuantity: 500000,
        maxOrderValue: 50000000,
        maxPosition: 1000000
    },
    RETAIL_ACCOUNT: {
        userId: "acc-retail-01",
        name: "Standard Retail Account",
        cashBalance: 200000.00, // ₹2 Lakhs
        holdings: {
            RELIANCE: 50,
            INFY: 100
        },
        shortPosition: {},
        margin: 1.0,
        maxOrderQuantity: 5000,
        maxOrderValue: 500000,
        maxPosition: 25000
    },
    LOW_BALANCE_ACCOUNT: {
        userId: "acc-low-01",
        name: "Low Balance Account",
        cashBalance: 10000.00, // ₹10,000 only
        holdings: {},
        shortPosition: {},
        margin: 1.0,
        maxOrderQuantity: 100,
        maxOrderValue: 10000,
        maxPosition: 500
    },
    HIGH_BALANCE_ACCOUNT: {
        userId: "acc-high-01",
        name: "Ultra High Net-Worth Account",
        cashBalance: 100000000.00, // ₹10 Crores
        holdings: {
            RELIANCE: 20000,
            TCS: 15000,
            INFY: 30000
        },
        shortPosition: {},
        margin: 3.0,
        maxOrderQuantity: 100000,
        maxOrderValue: 20000000,
        maxPosition: 500000
    },
    RISK_LIMIT_ACCOUNT: {
        userId: "acc-risk-limit-01",
        name: "Restricted Risk Limit Account",
        cashBalance: 50000.00, // ₹50,000
        holdings: {
            RELIANCE: 10
        },
        shortPosition: {},
        margin: 1.0,
        maxOrderQuantity: 50,
        maxOrderValue: 30000,
        maxPosition: 100
    }
};

// 2. ULTRA-FAST IN-MEMORY MOCK DATABASE
class MockRiskDatabase {
    constructor(accounts = SYNTHETIC_ACCOUNTS, universe = NSE_EQUITY_UNIVERSE) {
        this.accounts = JSON.parse(JSON.stringify(accounts)); // Deep clone
        this.universe = universe;
        this.decisions = new Map(); // key: userId + clientOrderId -> decision
        this.reservations = [];
        this.auditEvents = [];
        this.riskControls = [
            { scope: "GLOBAL", symbol: null, trading_enabled: true }
        ];
        this.dailyPnl = new Map(); // userId -> number
    }

    reset() {
        this.accounts = JSON.parse(JSON.stringify(SYNTHETIC_ACCOUNTS));
        this.decisions.clear();
        this.reservations = [];
        this.auditEvents = [];
        this.dailyPnl.clear();
    }

    getAccount(userId) {
        return Object.values(this.accounts).find(a => a.userId === userId) || null;
    }

    async query(sql, params = []) {
        const s = sql.replace(/\s+/g, " ").trim();

        // 1. SELECT from stocks
        if (s.includes("FROM stocks WHERE symbol = $1")) {
            const sym = params[0];
            const stock = this.universe[sym];
            if (stock) {
                return { rows: [{ symbol: sym, last_price: stock.referencePrice }] };
            }
            return { rows: [] };
        }

        // 2. SELECT risk_controls
        if (s.includes("FROM risk_controls WHERE")) {
            const sym = params[0];
            const controls = this.riskControls.filter(c => 
                (c.scope === "GLOBAL" && c.symbol === null) ||
                (c.scope === "SYMBOL" && c.symbol === sym)
            );
            return { rows: controls };
        }

        // 3. Duplicate check in risk_decisions
        if (s.includes("FROM risk_decisions WHERE user_id = $1 AND client_order_id = $2")) {
            const [userId, clientOrderId] = params;
            const key = `${userId}:${clientOrderId}`;
            if (this.decisions.has(key)) {
                return { rows: [{ id: this.decisions.get(key).id }] };
            }
            return { rows: [] };
        }

        // 4. SELECT balance FROM users FOR UPDATE
        if (s.includes("SELECT balance FROM users WHERE user_id = $1")) {
            const userId = params[0];
            const acc = this.getAccount(userId);
            if (acc) {
                return { rows: [{ balance: acc.cashBalance }] };
            }
            return { rows: [] };
        }

        // 5. SELECT realized_pnl FROM risk_daily_pnl
        if (s.includes("FROM risk_daily_pnl WHERE user_id = $1")) {
            const userId = params[0];
            const pnl = this.dailyPnl.get(userId) || 0;
            return { rows: [{ realized_pnl: pnl }] };
        }

        // 6. SELECT pendingBuys FROM limit_orders
        if (s.includes("FROM limit_orders WHERE user_id = $1 AND symbol = $2 AND side = 'BUY' AND status = 'PENDING'")) {
            return { rows: [{ quantity: 0 }] };
        }

        // 7. SELECT quantity FROM portfolio_holdings
        if (s.includes("FROM portfolio_holdings WHERE user_id = $1 AND symbol = $2")) {
            const [userId, symbol] = params;
            const acc = this.getAccount(userId);
            const qty = (acc && acc.holdings && acc.holdings[symbol]) ? acc.holdings[symbol] : 0;
            return { rows: [{ quantity: qty }] };
        }

        // 8. Reserved holdings calculation
        if (s.includes("reservation_type = 'HOLDINGS'") || s.includes("status = 'PENDING'")) {
            return { rows: [{ quantity: 0 }] };
        }

        // 9. INSERT INTO risk_decisions
        if (s.startsWith("INSERT INTO risk_decisions")) {
            const [corrId, userId, clientOrderId] = params;
            if (clientOrderId) {
                this.decisions.set(`${userId}:${clientOrderId}`, { id: corrId });
            }
            return { rowCount: 1 };
        }

        // 10. INSERT INTO risk_reservations
        if (s.startsWith("INSERT INTO risk_reservations")) {
            this.reservations.push({
                correlationId: params[0],
                userId: params[1],
                reservationType: params[2],
                symbol: params[3],
                amount: params[4],
                quantity: params[5],
                status: params[6]
            });
            return { rowCount: 1 };
        }

        // 11. INSERT INTO audit_events
        if (s.startsWith("INSERT INTO audit_events")) {
            this.auditEvents.push(params);
            return { rowCount: 1 };
        }

        // 12. UPDATE risk_reservations
        if (s.startsWith("UPDATE risk_reservations")) {
            return { rowCount: 1 };
        }

        // Fallback default
        return { rows: [], rowCount: 0 };
    }
}

module.exports = {
    SYNTHETIC_ACCOUNTS,
    MockRiskDatabase
};
