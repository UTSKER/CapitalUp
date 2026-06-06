const fs = require("fs");
const path = require("path");
const pool = require("../config/postgre");

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      "migrations",
      "002_create_profile_table.sql"
    ),
    "utf8"
  );

  await pool.query(sql);

  console.log("Migration executed");
}

runMigration();
