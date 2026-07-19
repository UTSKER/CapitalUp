const { redisClient } = require("../../config/redis");

/**
 * Acquires a distributed lock using Redis.
 * @param {string} key - Lock key
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {Promise<boolean>} True if lock acquired, false otherwise
 */
async function acquireLock(key, ttlMs = 15000) {
  try {
    const result = await redisClient.set(`lock:${key}`, "locked", {
      NX: true,
      PX: ttlMs
    });
    return result === "OK";
  } catch (err) {
    console.error(`Redis lock acquisition error for key ${key}:`, err.message);
    // If Redis is down, we fallback to database transactional safety (SELECT FOR UPDATE)
    return true; 
  }
}

/**
 * Releases a distributed lock in Redis.
 * @param {string} key - Lock key
 */
async function releaseLock(key) {
  try {
    await redisClient.del(`lock:${key}`);
  } catch (err) {
    console.error(`Redis lock release error for key ${key}:`, err.message);
  }
}

module.exports = {
  acquireLock,
  releaseLock
};
