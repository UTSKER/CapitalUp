require("dotenv").config({ override: true });

const http = require("http");
const app = require("./app");

const {
  redisClient,
  publisher,
  subscriber,
} = require("./config/redis");

const pool = require("./config/postgre");

const {
  startMarketDataJob,
  startDayOrderExpiryJob,
} = require("./modules/market-data/jobs/marketdata.job");

const {
  loadPendingLimitOrdersIntoMatchingEngine,
} = require("./modules/limit-order/services/limitOrder.service");

const {
  loadPendingStopOrdersIntoMatchingEngine,
} = require("./modules/stop-order/services/stopOrder.service");

const {
  initializeSocket,
} = require("../src/websockets/socket.js");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

async function startServer() {
  try {
    // Initialize Redis connections (uses resilient local in-memory fallback if real connection fails)
    await redisClient.connect();
    await publisher.connect();
    await subscriber.connect();

    console.log("Redis Connected");

    try {
      await redisClient.flushAll();
      console.log("Redis Cache Flushed Successfully");
    } catch (redisErr) {
      console.warn("Failed to flush Redis on startup:", redisErr.message);
    }

    await pool.query("SELECT NOW()");

    console.log("DB Connected");

    // =========================================================================
    // STARTUP DATABASE CLEANUP / RESET STEP (Commented out to persist user data)
    // =========================================================================
    // console.warn("⚠️  Resetting all balances to 15,000 and removing all order/holding/ledger data...");
    // try {
    //   await pool.query(`
    //     TRUNCATE TABLE 
    //       "stop_orders", "limit_orders", "orders", "portfolio_holdings",
    //       "ledger_entries", "ledger_transactions", "refunds", "deposits",
    //       "withdrawals", "payment_orders", "wallets" 
    //     CASCADE;
    //   `);
    //   await pool.query(`
    //     UPDATE "users" SET "balance" = 15000.00;
    //   `);
    //   console.log("✔ Database cleared successfully: All users have 15,000 balance and 0 shares.");
    // } catch (cleanErr) {
    //   console.error("❌ Database cleanup failed during startup:", cleanErr.message);
    // }

    try {
      const fs = require("fs");
      const path = require("path");

      const migrationSql = fs.readFileSync(
        path.join(
          __dirname,
          "database",
          "migrations",
          "002_create_profile_table.sql"
        ),
        "utf8"
      );

      await pool.query(migrationSql);

      console.log(
        "Profiles migration check: profiles table is ready"
      );
    } catch (migrationErr) {
      if (
        migrationErr.message.includes("already exists")
      ) {
        console.log(
          "Profiles migration check: profiles table already exists"
        );
      } else {
        console.error(
          "Profiles migration warning:",
          migrationErr.message
        );
      }
    }

    try {
      await pool.query(`
        ALTER TABLE users
        ALTER COLUMN mobile_number
        DROP NOT NULL
      `);

      console.log(
        "DB constraint updated: mobile_number is now nullable"
      );
    } catch (err) {
      console.error(
        "Failed to alter users mobile_number constraint:",
        err.message
      );
    }

    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) NOT NULL DEFAULT 15000.00
      `);
      await pool.query(`
        ALTER TABLE users ALTER COLUMN balance SET DEFAULT 15000.00
      `);
      console.log("DB update check: balance column in users table is ready and default is set to 15,000");
    } catch (err) {
      console.error("Failed to add/alter balance column in users table:", err.message);
    }

    const restoredLimitOrders =
      await loadPendingLimitOrdersIntoMatchingEngine();

    console.log(
      `Matching Engine restored ${restoredLimitOrders} pending limit orders`
    );

    const restoredStopOrders =
      await loadPendingStopOrdersIntoMatchingEngine();

    console.log(
      `Matching Engine restored ${restoredStopOrders} pending stop orders`
    );

    initializeSocket(server);
    const startSubscriber = require("../src/websockets/subscriber.js");

    await startSubscriber();

    // To enable live market data updates, uncomment the lines below:
    startMarketDataJob();
    console.log("Market Data Feed Job Started");
    startDayOrderExpiryJob();

    console.log("Market Data Jobs Initialized");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();