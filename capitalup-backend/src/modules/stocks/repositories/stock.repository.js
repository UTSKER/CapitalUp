const pool = require(
  "../../../config/postgre"
);

function mapStockRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    symbol: row.symbol,
    companyName: row.company_name,
    exchange: row.exchange,
    instrumentType: row.instrument_type,
    sector: row.sector,
    isActive: row.is_active,
    lastPrice: row.last_price,
    dayHigh: row.day_high,
    dayLow: row.day_low,
    marketOpen: row.market_open,
    previousClose: row.previous_close,
    priceUpdatedAt: row.price_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

  return result.rows.map(
    mapStockRow
  );
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

  return mapStockRow(
    result.rows[0]
  );
}

async function getTrackedStockSymbols() {
  const result =
    await pool.query(
      `
      SELECT symbol
      FROM stocks
      WHERE is_active = TRUE
      ORDER BY symbol ASC
      `
    );

  return result.rows.map(
    (row) => row.symbol
  );
}

async function updateStockMarketData(
  symbol,
  stockData
) {
  const result =
    await pool.query(
      `
      UPDATE stocks
      SET
        last_price = $2,
        day_high = $3,
        day_low = $4,
        market_open = $5,
        previous_close = $6,
        price_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE symbol = $1
      RETURNING *;
      `,
      [
        symbol,
        stockData.price,
        stockData.high,
        stockData.low,
        stockData.open,
        stockData.previousClose,
      ]
    );

  return mapStockRow(
    result.rows[0]
  );
}

module.exports = {
  searchStocks,
  findStockBySymbol,
  getTrackedStockSymbols,
  updateStockMarketData,
};
