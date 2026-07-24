const fs = require("fs");
const path = require("path");
const pool = require("../config/postgre");

async function runMigration() {
  const files = [
    //"001_create_users_table.sql",
    //"002_create_profile_table.sql",
    // "003_create_kyc_info_table.sql",
    // "004_create_kyc_documents_table.sql",
    // "005_create_watchlists_table.sql",
    // "006_create_stocks_table.sql",
    //"007_create_portfolio_holdings_table.sql",
    //"008_create_orders_table.sql",
    //"009_add_profile_marital_status.sql",
    //"010_create_limit_orders_table.sql",
    //"011_create_notifications_table.sql",
    //"012_add_stock_market_data_columns.sql",
    "013_create_stop_orders_table.sql",
    "014_add_balance_column.sql",
    "015_create_risk_and_audit_tables.sql",
    "016_create_risk_controls.sql",
    "017_create_market_ticks.sql",
    "018_add_risk_latency.sql"
  ];

  for (const file of files) {
    const sql = fs.readFileSync(
      path.join(__dirname, "migrations", file),
      "utf8"
    );

    await pool.query(sql);
    console.log(`${file} executed`);
  }

  console.log("All migrations executed");
}

runMigration();
