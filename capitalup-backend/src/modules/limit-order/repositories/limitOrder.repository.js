const pool = require(
  "../../../config/postgre"
);

function mapLimitOrderRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity,
    limitPrice: row.limit_price,
    status: row.status,
    validity: row.validity,
    executedPrice: row.executed_price,
    createdAt: row.created_at,
    executedAt: row.executed_at,
    updatedAt: row.updated_at,
  };
}

function mapLimitOrderTradeRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    limitOrderId: row.limit_order_id,
    userId: row.user_id,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity,
    price: row.price,
    createdAt: row.created_at,
  };
}

async function createLimitOrder({
  userId,
  symbol,
  side,
  quantity,
  limitPrice,
  validity = "DAY",
}, db = pool) {
  const result =
    await db.query(
      `
      INSERT INTO limit_orders (
        user_id,
        symbol,
        side,
        quantity,
        limit_price,
        validity
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
        limitPrice,
        validity,
      ]
    );

  return mapLimitOrderRow(
    result.rows[0]
  );
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

  return result.rows.map(
    mapLimitOrderRow
  );
}

async function cancelLimitOrder(
  id,
  userId,
  db = pool
) {
  const result =
    await db.query(
      `
      UPDATE limit_orders
      SET
        status = 'CANCELLED',
        updated_at = CURRENT_TIMESTAMP
      WHERE
        id = $1
        AND user_id = $2
        AND status = 'PENDING'
      RETURNING *;
      `,
      [id, userId]
    );

  return mapLimitOrderRow(
    result.rows[0]
  );
}

async function getLimitOrderById(
  id,
  db = pool
) {
  const result =
    await db.query(
      `
      SELECT *
      FROM limit_orders
      WHERE id = $1
      `,
      [id]
    );

  return mapLimitOrderRow(
    result.rows[0]
  );
}

async function lockPendingLimitOrderById(
  id,
  db = pool
) {
  const result =
    await db.query(
      `
      SELECT *
      FROM limit_orders
      WHERE
        id = $1
        AND status = 'PENDING'
      FOR UPDATE
      `,
      [id]
    );

  return mapLimitOrderRow(
    result.rows[0]
  );
}

async function getPendingLimitOrders(
  db = pool
) {
  const result =
    await db.query(
      `
      SELECT *
      FROM limit_orders
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      `
    );

  return result.rows.map(
    mapLimitOrderRow
  );
}

async function markLimitOrderFilled({
  id,
  executedPrice,
}, db = pool) {
  const result =
    await db.query(
      `
      UPDATE limit_orders
      SET
        status = 'FILLED',
        executed_price = $2,
        executed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE
        id = $1
        AND status = 'PENDING'
      RETURNING *;
      `,
      [
        id,
        executedPrice,
      ]
    );

  return mapLimitOrderRow(
    result.rows[0]
  );
}

async function expireDayLimitOrders(
  db = pool
) {
  const result =
    await db.query(
      `
      UPDATE limit_orders
      SET
        status = 'EXPIRED',
        updated_at = CURRENT_TIMESTAMP
      WHERE
        status = 'PENDING'
        AND validity = 'DAY'
      RETURNING *;
      `
    );

  return result.rows.map(
    mapLimitOrderRow
  );
}

async function createLimitOrderTrade({
  tradeId,
  limitOrderId,
  userId,
  symbol,
  side,
  quantity,
  price,
}, db = pool) {
  // No-op: limit order trade persistence is not supported in current schema.
  // Returning null to maintain function signature without database interaction.
  return null;
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
  getLimitOrderById,
  lockPendingLimitOrderById,
  getPendingLimitOrders,
  markLimitOrderFilled,
  expireDayLimitOrders,
  createLimitOrderTrade,
};
