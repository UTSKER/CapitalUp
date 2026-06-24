const pool = require(
  "../../../config/postgre"
);

async function searchStocks(
  query
) {
  const result =
    await pool.query(
      `
      SELECT
        id,
        symbol,
        company_name,
        exchange,
        instrument_type,
        sector

      FROM stocks

      WHERE
        is_active = TRUE
        AND (
          symbol ILIKE $1
          OR
          company_name ILIKE $1
        )

      ORDER BY
        CASE
          WHEN symbol ILIKE $2 THEN 1
          WHEN company_name ILIKE $2 THEN 2
          ELSE 3
        END,
        company_name ASC

      LIMIT 10
      `,
      [
        `%${query}%`,
        `${query}%`,
      ]
    );

  return result.rows;
}

async function findStockBySymbol(
  symbol
) {
  const result =
    await pool.query(
      `
      SELECT *
      FROM stocks
      WHERE
        symbol = $1
        AND is_active = TRUE
      `,
      [symbol]
    );

  return result.rows[0];
}

module.exports = {
  searchStocks,
  findStockBySymbol,
};