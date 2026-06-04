const { getRedisClient } = require("../../config/redis");

async function runRedis(operation) {
  try {
    const client = await getRedisClient();
    return await operation(client);
  } catch (error) {
    const redisError = new Error("Verification service is temporarily unavailable");
    redisError.statusCode = 503;
    redisError.cause = error;
    throw redisError;
  }
}

function verificationKey(email) {
  return `verification:${email.toLowerCase()}`;
}

function refreshKey(userId) {
  return `refresh:${userId}`;
}

async function storeVerificationToken(email, token, expiryTime = 10 * 60) {
  return runRedis((client) =>
    client.set(verificationKey(email), token, { EX: expiryTime })
  );
}

async function storeRefreshToken(userId, token, expiryTime = 7 * 24 * 60 * 60) {
  return runRedis((client) =>
    client.set(refreshKey(userId), token, { EX: expiryTime })
  );
}

async function getToken(key) {
  return runRedis((client) => client.get(key));
}

async function deleteToken(key) {
  return runRedis((client) => client.del(key));
}

async function isTokenExpired(key) {
  return (await getToken(key)) === null;
}

async function getTokenTTL(key) {
  return runRedis((client) => client.ttl(key));
}

async function incrementWithExpiry(key, expiryTime) {
  return runRedis(async (client) => {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, expiryTime);
    }
    return count;
  });
}

module.exports = {
  verificationKey,
  refreshKey,
  storeVerificationToken,
  storeRefreshToken,
  getToken,
  deleteToken,
  isTokenExpired,
  getTokenTTL,
  incrementWithExpiry,
};
