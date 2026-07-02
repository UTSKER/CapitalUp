const {redisClient} = require("../../config/redis");

function verificationKey(email) {
  return `verification:${email}`;
}

function refreshKey(userId) {
  return `refresh:${userId}`;
}

async function storeVerificationToken(
  email,
  token,
  expiryTime = 10 * 60
) {
  await redisClient.setEx(
    verificationKey(email),
    expiryTime,
    token
  );
}

async function storeRefreshToken(
  userId,
  token,
  expiryTime = 7 * 24 * 60 * 60
) {
  await redisClient.setEx(
    refreshKey(userId),
    expiryTime,
    token
  );
}

async function getToken(key) {
  return redisClient.get(key);
}

async function deleteToken(key) {
  return redisClient.del(key);
}

async function isTokenExpired(key) {
  const exists = await redisClient.exists(key);
  return exists === 0;
}

async function getTokenTTL(key) {
  return redisClient.ttl(key);
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
};
