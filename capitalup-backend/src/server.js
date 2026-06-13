require("dotenv").config();

const app = require("./app");
const redisClient = require("./config/redis");
const pool = require("./config/postgre");

const {
  startMarketDataJob,
} = require(
  "./modules/market-data/jobs/marketdata.job"
);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await redisClient.connect();

    console.log(
      "Redis Connected"
    );

    await pool.query(
      "SELECT NOW()"
    );

    console.log(
      "DB Connected"
    );

    try {
      const fs = require("fs");
      const path = require("path");

      const migrationSql =
        fs.readFileSync(
          path.join(
            __dirname,
            "database",
            "migrations",
            "002_create_profile_table.sql"
          ),
          "utf8"
        );

      await pool.query(
        migrationSql
      );

      console.log(
        "Profiles migration check: profiles table is ready"
      );
    } catch (migrationErr) {
      if (
        migrationErr.message.includes(
          "already exists"
        )
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
      await pool.query(
        `
        ALTER TABLE users
        ALTER COLUMN mobile_number
        DROP NOT NULL
      `
      );

      console.log(
        "DB constraint updated: mobile_number is now nullable"
      );
    } catch (err) {
      console.error(
        "Failed to alter users mobile_number constraint:",
        err.message
      );
    }

    startMarketDataJob();

    console.log(
      "Market Data Job Started"
    );

    app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();