require("dotenv").config({ override: true });
const pool = require("./src/config/postgre");
const { redisClient } = require("./src/config/redis");

async function resetAll() {
  console.log("=== STARTING FULL DATABASE AND CACHE RESET ===");
  try {
    // 1. Flush Redis
    await redisClient.connect();
    console.log("Redis Connected. Flushing all cached keys...");
    await redisClient.flushAll();
    console.log("✔ Redis cache flushed successfully.");
    await redisClient.disconnect();

    // 2. Truncate Database Tables
    console.log("PostgreSQL Connected. Clearing all orders, holdings, wallets, and ledger entries...");
    await pool.query(`
      TRUNCATE TABLE
        "stop_orders", "limit_orders", "orders", "portfolio_holdings",
        "ledger_entries", "ledger_transactions", "refunds", "deposits",
        "withdrawals", "payment_orders", "wallets"
      CASCADE;
    `);

    // 3. Reset balances on users
    await pool.query(`
      UPDATE "users" SET "balance" = 15000.00;
    `);
    console.log("✔ Database reset complete: All users set to 15,000.00 balance and all shares/transaction histories deleted.");

    pool.end();
    console.log("=== RESET SUCCESSFUL ===");
    process.exit(0);
  } catch (err) {
    console.error("❌ Reset failed:", err.message);
    process.exit(1);
  }
}

resetAll();
