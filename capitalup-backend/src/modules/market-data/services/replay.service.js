const pool = require("../../../config/postgre");

function parseDate(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid replay date");
  }
  return parsed;
}

async function recordMarketTick({ symbol, price, timestamp, payload }) {
  await pool.query(
    `INSERT INTO market_ticks (symbol, price, tick_time, payload)
     VALUES ($1, $2, $3, $4)`,
    [symbol, price, timestamp, JSON.stringify(payload || {})]
  );
}

async function replayTimeline({ symbol, from, to, limit = 10000 }) {
  const start = parseDate(from, new Date(Date.now() - 24 * 60 * 60 * 1000));
  const end = parseDate(to, new Date());
  const max = Math.max(1, Math.min(Number(limit) || 10000, 50000));
  const normalizedSymbol = symbol ? String(symbol).trim().toUpperCase() : null;

  const ticks = await pool.query(
    `SELECT 'MARKET_TICK' AS type, symbol, price, tick_time AS occurred_at, payload
     FROM market_ticks
     WHERE tick_time BETWEEN $1 AND $2
       AND ($3::text IS NULL OR symbol = $3)
     ORDER BY tick_time ASC
     LIMIT $4`,
    [start, end, normalizedSymbol, max]
  );

  const events = await pool.query(
    `SELECT event_type AS type, payload, created_at AS occurred_at, entity_type, entity_id
     FROM audit_events
     WHERE created_at BETWEEN $1 AND $2
       AND ($3::text IS NULL OR payload->>'symbol' = $3)
     ORDER BY created_at ASC
     LIMIT $4`,
    [start, end, normalizedSymbol, max]
  );

  return [...ticks.rows, ...events.rows]
    .sort((left, right) => new Date(left.occurred_at) - new Date(right.occurred_at))
    .slice(0, max);
}

module.exports = {
  recordMarketTick,
  replayTimeline,
};
