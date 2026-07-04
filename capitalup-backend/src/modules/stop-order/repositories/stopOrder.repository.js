const pool = require(
  "../../../config/postgre"
);

function mapStopOrderRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity,
    stopPrice: row.stop_price,
    status: row.status,
    validity: row.validity,
    executedPrice: row.executed_price,
    linkedLimitOrderId: row.linked_limit_order_id,
    createdAt: row.created_at,
    executedAt: row.executed_at,
    updatedAt: row.updated_at,
  };
}

async function createStopOrder({
  userId,
  symbol,
  side,
  quantity,
  stopPrice,
  validity = "DAY",
  linkedLimitOrderId = null,
}, db = pool) {
  const result =
    await db.query(
      `
      INSERT INTO stop_orders (
        user_id,
        symbol,
        side,
        quantity,
        stop_price,
        validity,
        linked_limit_order_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING *;
      `,
      [
        userId,
        symbol,
        side,
        quantity,
        stopPrice,
        validity,
        linkedLimitOrderId,
      ]
    );

  return mapStopOrderRow(
    result.rows[0]
  );
}

async function getUserStopOrders(
  userId
) {
  const result =
    await pool.query(
      `
      SELECT *
      FROM stop_orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

  return result.rows.map(
    mapStopOrderRow
  );
}

async function cancelStopOrder(
  id,
  userId,
  db = pool
) {
  const result =
    await db.query(
      `
      UPDATE stop_orders
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

  return mapStopOrderRow(
    result.rows[0]
  );
}

// System-initiated cancel (OCO cascade) — ownership was validated
// when the link was created, so no user_id filter here.
async function cancelPendingStopOrderById(
  id,
  db = pool
) {
  const result =
    await db.query(
      `
      UPDATE stop_orders
      SET
        status = 'CANCELLED',
        updated_at = CURRENT_TIMESTAMP
      WHERE
        id = $1
        AND status = 'PENDING'
      RETURNING *;
      `,
      [id]
    );

  return mapStopOrderRow(
    result.rows[0]
  );
}

async function getStopOrderById(
  id,
  db = pool
) {
  const result =
    await db.query(
      `
      SELECT *
      FROM stop_orders
      WHERE id = $1
      `,
      [id]
    );

  return mapStopOrderRow(
    result.rows[0]
  );
}

async function lockPendingStopOrderById(
  id,
  db = pool
) {
  const result =
    await db.query(
      `
      SELECT *
      FROM stop_orders
      WHERE
        id = $1
        AND status = 'PENDING'
      FOR UPDATE
      `,
      [id]
    );

  return mapStopOrderRow(
    result.rows[0]
  );
}

async function lockPendingStopOrderByLinkedLimitId(
  limitOrderId,
  db = pool
) {
  const result =
    await db.query(
      `
      SELECT *
      FROM stop_orders
      WHERE
        linked_limit_order_id = $1
        AND status = 'PENDING'
      FOR UPDATE
      `,
      [limitOrderId]
    );

  return mapStopOrderRow(
    result.rows[0]
  );
}

async function getPendingStopOrders(
  db = pool
) {
  const result =
    await db.query(
      `
      SELECT *
      FROM stop_orders
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      `
    );

  return result.rows.map(
    mapStopOrderRow
  );
}

async function markStopOrderFilled({
  id,
  executedPrice,
}, db = pool) {
  const result =
    await db.query(
      `
      UPDATE stop_orders
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

  return mapStopOrderRow(
    result.rows[0]
  );
}

async function expireDayStopOrders(
  db = pool
) {
  const result =
    await db.query(
      `
      UPDATE stop_orders
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
    mapStopOrderRow
  );
}

// Startup reconciliation: a linked stop whose limit leg is no longer
// PENDING must not stay live (covers manual data drift / crashes).
async function cancelOrphanedLinkedStopOrders(
  db = pool
) {
  const result =
    await db.query(
      `
      UPDATE stop_orders s
      SET
        status = 'CANCELLED',
        updated_at = CURRENT_TIMESTAMP
      WHERE
        s.status = 'PENDING'
        AND s.linked_limit_order_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM limit_orders lo
          WHERE
            lo.id = s.linked_limit_order_id
            AND lo.status <> 'PENDING'
        )
      RETURNING *;
      `
    );

  return result.rows.map(
    mapStopOrderRow
  );
}

module.exports = {
  createStopOrder,
  getUserStopOrders,
  cancelStopOrder,
  cancelPendingStopOrderById,
  getStopOrderById,
  lockPendingStopOrderById,
  lockPendingStopOrderByLinkedLimitId,
  getPendingStopOrders,
  markStopOrderFilled,
  expireDayStopOrders,
  cancelOrphanedLinkedStopOrders,
};
