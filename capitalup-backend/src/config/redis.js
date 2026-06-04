const { createClient } = require("redis");

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

const client = createClient({
  url: redisUrl,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => (retries >= 2 ? false : Math.min(retries * 200, 500)),
  },
});

client.on("error", (error) => {
  console.error("Redis error:", error.message);
});

let connectionPromise;

async function getRedisClient() {
  if (client.isReady) {
    return client;
  }

  if (!connectionPromise) {
    connectionPromise = client.connect().finally(() => {
      connectionPromise = undefined;
    });
  }

  await connectionPromise;
  return client;
}

module.exports = {
  getRedisClient,
};
