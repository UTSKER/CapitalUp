const { redisClient } = require("../../../config/redis");
const pool = require("../../../config/postgre");

/**
 * Retrieves the user's cash balance.
 * Uses Redis cache as primary store, falling back to PostgreSQL if cache is cold.
 * @param {string|number} userId 
 * @returns {Promise<number>}
 */
async function getUserBalance(userId) {
  const cacheKey = `user:balance:${userId}`;
  try {
    const cachedBalance = await redisClient.get(cacheKey);
    if (cachedBalance !== null) {
      return Number(cachedBalance);
    }
  } catch (err) {
    console.error("Redis error in getUserBalance:", err.message);
  }

  // Fallback to PostgreSQL
  const result = await pool.query(
    "SELECT balance FROM users WHERE user_id = $1",
    [userId]
  );

  const balance = result.rows[0] ? Number(result.rows[0].balance) : 10000.00;

  // Cache in Redis
  try {
    await redisClient.set(cacheKey, balance.toFixed(2));
  } catch (err) {
    console.error("Redis set error in getUserBalance:", err.message);
  }

  return balance;
}

/**
 * Synchronizes the user's balance to Redis cache.
 * @param {string|number} userId 
 * @param {number} balance 
 */
async function syncBalanceToRedis(userId, balance) {
  const cacheKey = `user:balance:${userId}`;
  try {
    await redisClient.set(cacheKey, balance.toFixed(2));
  } catch (err) {
    console.error("Redis sync error in syncBalanceToRedis:", err.message);
  }
}

module.exports = {
  getUserBalance,
  syncBalanceToRedis,
};
