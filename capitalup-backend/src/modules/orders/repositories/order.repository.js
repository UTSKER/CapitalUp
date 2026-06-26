const pool = require(
  "../../../config/postgre"
);

async function createOrder({
  userId,
  symbol,
  side,
  quantity,
  price,
  status,
}, db = pool) {
  const result =
    await db.query(
      `
      INSERT INTO orders (
        user_id,
        symbol,
        side,
        quantity,
        price,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
      RETURNING *;
      `,
      [
        userId,
        symbol,
        side,
        quantity,
        price,
        status,
      ]
    );

  return result.rows[0];
}

async function getOrdersByUser(
  userId
) {
  const result =
    await pool.query(
      `
      SELECT *
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

  return result.rows;
}

async function getOrderById(
  orderId
) {
  const result =
    await pool.query(
      `
      SELECT *
      FROM orders
      WHERE id = $1
      `,
      [orderId]
    );

  return result.rows[0];
}

module.exports = {
  createOrder,
  getOrdersByUser,
  getOrderById,
};
