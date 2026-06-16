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
        LOWER(symbol) LIKE LOWER($1)
        OR
        LOWER(company_name) LIKE LOWER($1)
      LIMIT 10
      `,
      [`%${query}%`]
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
      WHERE symbol = $1
      `,
      [symbol]
    );

  return result.rows[0];
}

module.exports = {
  searchStocks,
  findStockBySymbol,
};