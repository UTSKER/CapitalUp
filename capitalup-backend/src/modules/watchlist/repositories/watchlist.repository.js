const pool = require("../../../config/postgre");

async function addStockToWatchlist(
  userId,
  symbol
) {
  const result = await pool.query(
    `
      INSERT INTO watchlists (
        user_id,
        symbol
      )
      VALUES (
        $1,
        $2
      )
      RETURNING *;
    `,
    [userId, symbol]
  );

  return result.rows[0];
}

async function getWatchlistByUserId(
  userId
) {
  const result = await pool.query(
    `
      SELECT *
      FROM watchlists
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `,
    [userId]
  );

  return result.rows;
}

async function removeStockFromWatchlist(
  userId,
  symbol
) {
  const result = await pool.query(
    `
      DELETE FROM watchlists
      WHERE user_id = $1
      AND symbol = $2
      RETURNING *;
    `,
    [userId, symbol]
  );

  return result.rows[0];
}

async function findWatchlistStock(
  userId,
  symbol
) {
  const result = await pool.query(
    `
      SELECT *
      FROM watchlists
      WHERE user_id = $1
      AND symbol = $2;
    `,
    [userId, symbol]
  );

  return result.rows[0];
}

module.exports = {
  addStockToWatchlist,
  getWatchlistByUserId,
  removeStockFromWatchlist,
  findWatchlistStock,
};