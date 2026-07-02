require("dotenv").config({ override: true });

const { createClient } = require("redis");

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

const redisClient = createClient({
  url: redisUrl,
  password: process.env.REDIS_PASSWORD || undefined,
});

const publisher = redisClient.duplicate();
const subscriber = redisClient.duplicate();

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

publisher.on("error", (err) => {
  console.error("Redis Publisher Error:", err);
});

subscriber.on("error", (err) => {
  console.error("Redis Subscriber Error:", err);
});

module.exports = {
  redisClient,
  publisher,
  subscriber,
};