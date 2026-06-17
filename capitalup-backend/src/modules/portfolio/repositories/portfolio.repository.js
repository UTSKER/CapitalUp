const pool = require(
  "../../../config/postgre"
);

async function findHoldingBySymbol(
  userId,
  symbol
) {
  const result =
    await pool.query(
      `
      SELECT *
      FROM portfolio_holdings
      WHERE user_id = $1
      AND symbol = $2
      `,
      [userId, symbol]
    );

  return result.rows[0];
}

async function createHolding({
  userId,
  symbol,
  quantity,
  averageBuyPrice,
}) {
  const result =
    await pool.query(
      `
      INSERT INTO portfolio_holdings (
        user_id,
        symbol,
        quantity,
        average_buy_price
      )
      VALUES (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *;
      `,
      [
        userId,
        symbol,
        quantity,
        averageBuyPrice,
      ]
    );

  return result.rows[0];
}

async function updateHolding({
  holdingId,
  quantity,
  averageBuyPrice,
}) {
  const result =
    await pool.query(
      `
      UPDATE portfolio_holdings
      SET
        quantity = $1,
        average_buy_price = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
      `,
      [
        quantity,
        averageBuyPrice,
        holdingId,
      ]
    );

  return result.rows[0];
}

async function deleteHolding(
  userId,
  symbol
) {
  const result =
    await pool.query(
      `
      DELETE FROM portfolio_holdings
      WHERE user_id = $1
      AND symbol = $2
      RETURNING *;
      `,
      [userId, symbol]
    );

  return result.rows[0];
}

async function getUserHoldings(
  userId
) {
  const result =
    await pool.query(
      `
      SELECT *
      FROM portfolio_holdings
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

  return result.rows;
}

module.exports = {
  findHoldingBySymbol,
  createHolding,
  updateHolding,
  deleteHolding,
  getUserHoldings,
};