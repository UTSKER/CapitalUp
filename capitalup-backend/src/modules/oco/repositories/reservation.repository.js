const pool = require(
  "../../../config/postgre"
);

// Shares reserved by pending SELL orders across both order tables.
// Linked (OCO) sell stops are excluded: their quantity is already
// reserved by the linked limit leg and at most one leg can fill.
async function getReservedSellQuantity(
  userId,
  symbol,
  db = pool
) {
  const result =
    await db.query(
      `
      SELECT
        COALESCE((
          SELECT SUM(quantity)
          FROM limit_orders
          WHERE
            user_id = $1
            AND symbol = $2
            AND side = 'SELL'
            AND status = 'PENDING'
        ), 0)
        +
        COALESCE((
          SELECT SUM(quantity)
          FROM stop_orders
          WHERE
            user_id = $1
            AND symbol = $2
            AND side = 'SELL'
            AND status = 'PENDING'
            AND linked_limit_order_id IS NULL
        ), 0) AS reserved_quantity
      `,
      [userId, symbol]
    );

  return Number(
    result.rows[0]
      .reserved_quantity
  );
}

module.exports = {
  getReservedSellQuantity,
};
