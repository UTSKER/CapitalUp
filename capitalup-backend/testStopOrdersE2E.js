// End-to-end test for stop orders + OCO cascades against the real DB/Redis.
// Creates a dedicated test user, runs all scenarios, and cleans up after itself.
// Run: node testStopOrdersE2E.js
require("dotenv").config({ override: true });

const assert = require("assert");
const pool = require("./src/config/postgre");
const { redisClient } = require("./src/config/redis");
const matchingEngine = require("./src/matching-engine");

const {
  placeLimitOrder,
  removeLimitOrder,
  processMarketPriceForLimitOrders,
} = require("./src/modules/limit-order/services/limitOrder.service");

const {
  placeStopOrder,
  removeStopOrder,
  processMarketPriceForStopOrders,
} = require("./src/modules/stop-order/services/stopOrder.service");

const { buyStock } = require("./src/modules/portfolio/services/portfolio.service");

const SYMBOL = "JIOFIN.NS";
let testUserId;

async function setPrice(price) {
  await redisClient.set(`stock:${SYMBOL}`, JSON.stringify({ price }));
}

async function getRow(table, id) {
  const r = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return r.rows[0];
}

async function getHolding() {
  const r = await pool.query(
    `SELECT * FROM portfolio_holdings WHERE user_id = $1 AND symbol = $2`,
    [testUserId, SYMBOL]
  );
  return r.rows[0];
}

async function notificationCount(title) {
  const r = await pool.query(
    `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND title = $2`,
    [testUserId, title]
  );
  return Number(r.rows[0].count);
}

async function expectError(promise, fragment, label) {
  try {
    await promise;
    assert.fail(`${label}: expected error containing "${fragment}"`);
  } catch (err) {
    assert.ok(
      err.message.includes(fragment),
      `${label}: expected "${fragment}", got "${err.message}"`
    );
  }
  console.log(`ok - ${label}`);
}

async function cleanup() {
  if (!testUserId) return;
  await pool.query(`DELETE FROM stop_orders WHERE user_id = $1`, [testUserId]);
  await pool.query(`DELETE FROM limit_orders WHERE user_id = $1`, [testUserId]);
  await pool.query(`DELETE FROM orders WHERE user_id = $1`, [testUserId]);
  await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [testUserId]);
  await pool.query(`DELETE FROM portfolio_holdings WHERE user_id = $1`, [testUserId]);
  await pool.query(`DELETE FROM users WHERE user_id = $1`, [testUserId]);
}

async function main() {
  await redisClient.connect();

  const userRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash)
     VALUES ('Stop Order E2E Test', 'stop-order-e2e@test.local', 'x')
     RETURNING user_id`
  );
  testUserId = userRes.rows[0].user_id;
  console.log(`Test user: ${testUserId}`);

  await setPrice(300);

  // --- Placement validation ---
  await expectError(
    placeStopOrder(testUserId, { symbol: SYMBOL, side: "BUY", quantity: 1, stopPrice: 290 }),
    "must be above the current market price",
    "BUY STOP below market rejected"
  );
  await expectError(
    placeStopOrder(testUserId, { symbol: SYMBOL, side: "SELL", quantity: 1, stopPrice: 310 }),
    "must be below the current market price",
    "SELL STOP above market rejected"
  );
  await expectError(
    placeStopOrder(testUserId, { symbol: SYMBOL, side: "SELL", quantity: 1, stopPrice: 100 }),
    "within ±25%",
    "SELL STOP outside price band rejected"
  );
  await expectError(
    placeStopOrder(testUserId, { symbol: SYMBOL, side: "SELL", quantity: 1, stopPrice: 280 }),
    "do not own this stock",
    "SELL STOP without holdings rejected"
  );

  // --- Shared reservation across limit + stop orders ---
  await buyStock({ userId: testUserId, symbol: SYMBOL, quantity: 10, price: 250 });

  const standaloneStop = await placeStopOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 4, stopPrice: 280,
  });
  assert.strictEqual(standaloneStop.status, "PENDING");
  console.log("ok - standalone SELL STOP placed");

  await expectError(
    placeLimitOrder(testUserId, { symbol: SYMBOL, side: "SELL", quantity: 8, limitPrice: 320 }),
    "Only 6 shares available",
    "SELL LIMIT over-reserving rejected (stop reservation counted)"
  );

  const ocoLimit = await placeLimitOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 6, limitPrice: 320,
  });

  const ocoStop = await placeStopOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 6, stopPrice: 270,
    linkedLimitOrderId: ocoLimit.id,
  });
  assert.strictEqual(ocoStop.linkedLimitOrderId, ocoLimit.id);
  console.log("ok - linked OCO stop placed (no double reservation)");

  await expectError(
    placeStopOrder(testUserId, {
      symbol: SYMBOL, side: "SELL", quantity: 6, stopPrice: 265,
      linkedLimitOrderId: ocoLimit.id,
    }),
    "already has a linked stop order",
    "second linked stop rejected (unique index)"
  );

  await expectError(
    placeStopOrder(testUserId, { symbol: SYMBOL, side: "SELL", quantity: 1, stopPrice: 280 }),
    "Only 0 shares available",
    "fully reserved holdings reject further standalone stops"
  );

  // --- Cascade: limit fills -> linked stop auto-cancelled ---
  await setPrice(320);
  const limitTrades = await processMarketPriceForLimitOrders(SYMBOL, 320);
  assert.strictEqual(limitTrades.length, 1);
  assert.strictEqual((await getRow("limit_orders", ocoLimit.id)).status, "FILLED");
  assert.strictEqual((await getRow("stop_orders", ocoStop.id)).status, "CANCELLED");
  assert.strictEqual(matchingEngine.getStopOrder(SYMBOL, ocoStop.id), null);
  assert.strictEqual(Number((await getHolding()).quantity), 4);
  assert.ok(await notificationCount("Stop Order Cancelled (OCO)") >= 1);
  console.log("ok - limit fill cancelled linked stop (DB + engine), holdings updated");

  // --- Standalone stop still live, fills on price drop at market price ---
  await setPrice(280);
  const stopTrades = await processMarketPriceForStopOrders(SYMBOL, 280);
  assert.strictEqual(stopTrades.length, 1);
  const filledStop = await getRow("stop_orders", standaloneStop.id);
  assert.strictEqual(filledStop.status, "FILLED");
  assert.strictEqual(Number(filledStop.executed_price), 280);
  assert.strictEqual(await getHolding(), undefined); // sold out -> holding deleted
  assert.ok(await notificationCount("Stop Order Executed") >= 1);
  console.log("ok - standalone SELL STOP triggered at market price, portfolio updated");

  // --- Cascade: stop fills -> linked limit auto-cancelled ---
  await setPrice(300);
  await buyStock({ userId: testUserId, symbol: SYMBOL, quantity: 5, price: 300 });
  const limit2 = await placeLimitOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 5, limitPrice: 330,
  });
  const stop2 = await placeStopOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 5, stopPrice: 270,
    linkedLimitOrderId: limit2.id,
  });

  await setPrice(260);
  assert.strictEqual((await processMarketPriceForLimitOrders(SYMBOL, 260)).length, 0);
  const stopTrades2 = await processMarketPriceForStopOrders(SYMBOL, 260);
  assert.strictEqual(stopTrades2.length, 1);
  assert.strictEqual((await getRow("stop_orders", stop2.id)).status, "FILLED");
  assert.strictEqual((await getRow("limit_orders", limit2.id)).status, "CANCELLED");
  assert.strictEqual(matchingEngine.getOrder(SYMBOL, limit2.id), null);
  assert.ok(await notificationCount("Limit Order Cancelled (OCO)") >= 1);
  console.log("ok - stop fill cancelled linked limit (DB + engine)");

  // --- Manual cancel cascades both ways ---
  await setPrice(300);
  await buyStock({ userId: testUserId, symbol: SYMBOL, quantity: 3, price: 300 });

  const limit3 = await placeLimitOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 3, limitPrice: 330,
  });
  const stop3 = await placeStopOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 3, stopPrice: 270,
    linkedLimitOrderId: limit3.id,
  });
  await removeLimitOrder(limit3.id, testUserId);
  assert.strictEqual((await getRow("limit_orders", limit3.id)).status, "CANCELLED");
  assert.strictEqual((await getRow("stop_orders", stop3.id)).status, "CANCELLED");
  assert.strictEqual(matchingEngine.getStopOrder(SYMBOL, stop3.id), null);
  console.log("ok - cancelling limit leg cancelled linked stop");

  const limit4 = await placeLimitOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 3, limitPrice: 330,
  });
  const stop4 = await placeStopOrder(testUserId, {
    symbol: SYMBOL, side: "SELL", quantity: 3, stopPrice: 270,
    linkedLimitOrderId: limit4.id,
  });
  await removeStopOrder(stop4.id, testUserId);
  assert.strictEqual((await getRow("stop_orders", stop4.id)).status, "CANCELLED");
  assert.strictEqual((await getRow("limit_orders", limit4.id)).status, "CANCELLED");
  assert.strictEqual(matchingEngine.getOrder(SYMBOL, limit4.id), null);
  console.log("ok - cancelling stop leg cancelled linked limit");

  // --- BUY STOP triggers on price rise ---
  const buyStop = await placeStopOrder(testUserId, {
    symbol: SYMBOL, side: "BUY", quantity: 2, stopPrice: 350,
  });
  assert.strictEqual((await processMarketPriceForStopOrders(SYMBOL, 340)).length, 0);
  await setPrice(355);
  const buyTrades = await processMarketPriceForStopOrders(SYMBOL, 355);
  assert.strictEqual(buyTrades.length, 1);
  const filledBuyStop = await getRow("stop_orders", buyStop.id);
  assert.strictEqual(filledBuyStop.status, "FILLED");
  assert.strictEqual(Number(filledBuyStop.executed_price), 355);
  assert.strictEqual(Number((await getHolding()).quantity), 5); // 3 held + 2 bought
  console.log("ok - BUY STOP triggered at market price, portfolio updated");

  console.log("\nAll stop-order E2E tests passed");
}

main()
  .then(async () => {
    await cleanup();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("\nE2E FAILED:", err.message);
    try { await cleanup(); } catch (e) { console.error("cleanup failed:", e.message); }
    process.exit(1);
  });
