const fs = require("fs");
const path = require("path");
const pool = require("../config/postgre");

async function runMigration() {
  const files = [
    "001_create_users_table.sql",
    "002_create_profile_table.sql",
    "003_create_kyc_info_table.sql",
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