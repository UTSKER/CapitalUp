require("dotenv").config();

const app = require("./app");
const redisClient = require("./config/redis");
const pool = require("./config/postgre");

const PORT = process.env.PORT || 3000;

async function startServer() {
  await redisClient.connect();

  console.log("Redis Connected");

  await pool.query("SELECT NOW()");

  console.log("DB Connected");

  app.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT}`
    );
  });
}

startServer();