require("dotenv").config();

const { createClient } = require("redis");

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

const redisClient = createClient({
  url: redisUrl,
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

module.exports = redisClient;