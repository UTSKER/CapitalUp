const pool = require(
  "../../../config/postgre"
);

async function createLimitOrder({
  userId,
  symbol,
  side,
  quantity,
  limitPrice,
}) {
  const result =
    await pool.query(
      `
      INSERT INTO limit_orders (
        user_id,
        symbol,
        side,
        quantity,
        limit_price
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      RETURNING *;
      `,
      [
        userId,
        symbol,
        side,
        quantity,
        limitPrice,
      ]
    );

  return result.rows[0];
}

async function getUserLimitOrders(
  userId
) {
  const result =
    await pool.query(
      `
      SELECT *
      FROM limit_orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

  return result.rows;
}

async function cancelLimitOrder(
  id,
  userId
) {
  const result =
    await pool.query(
      `
      UPDATE limit_orders
      SET status = 'CANCELLED'
      WHERE
        id = $1
        AND user_id = $2
        AND status = 'PENDING'
      RETURNING *;
      `,
      [id, userId]
    );

  return result.rows[0];
}

async function getPendingSellQuantity(
  userId,
  symbol
) {
  const result =
    await pool.query(
      `
      SELECT
        COALESCE(
          SUM(quantity),
          0
        ) AS reserved_quantity
      FROM limit_orders
      WHERE
        user_id = $1
        AND symbol = $2
        AND side = 'SELL'
        AND status = 'PENDING'
      `,
      [userId, symbol]
    );

  return Number(
    result.rows[0]
      .reserved_quantity
  );
}

module.exports = {
  createLimitOrder,
  getUserLimitOrders,
  cancelLimitOrder,
  getPendingSellQuantity,
};