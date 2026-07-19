const {
  addStock,
  removeStock,
  listStocks,

  getPendingKycs,
  getKycDetails,
  approveUserKyc,
  rejectUserKyc,
} = require(
  "../services/admin.service"
);
const { setTradingControl } = require(
  "../../risk/services/risk.service"
);
const matchingEngine = require(
  "../../../matching-engine"
);
const {
  getLimitOrderById,
} = require(
  "../../limit-order/repositories/limitOrder.repository"
);
const {
  removeLimitOrder,
} = require(
  "../../limit-order/services/limitOrder.service"
);
const {
  replayTimeline,
} = require(
  "../../market-data/services/replay.service"
);
const pool = require("../../../config/postgre");
const {
  getRiskMetrics,
} = require(
  "../../risk/services/risk.service"
);
const {
  getConnectedSocketCount,
} = require(
  "../../../websockets/socket"
);

/* =========================
   STOCK MANAGEMENT
========================= */

async function createStock(
  req,
  res
) {
  try {
    const stock =
      await addStock(
        req.body
      );

    return res.status(201).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getStocks(
  req,
  res
) {
  try {
    const stocks =
      await listStocks();

    return res.status(200).json({
      success: true,
      data: stocks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function deleteStock(
  req,
  res
) {
  try {
    const { symbol } =
      req.params;

    const stock =
      await removeStock(
        symbol
      );

    return res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error.message,
    });
  }
}

/* =========================
   KYC MANAGEMENT
========================= */

async function getPendingKyc(
  req,
  res
) {
  try {
    const kycs =
      await getPendingKycs();

    return res.status(200).json({
      success: true,
      data: kycs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getKyc(
  req,
  res
) {
  try {
    const { userId } =
      req.params;

    const kyc =
      await getKycDetails(
        userId
      );

    return res.status(200).json({
      success: true,
      data: kyc,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function approveKyc(
  req,
  res
) {
  try {
    const { userId } =
      req.params;

    const result =
      await approveUserKyc(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "KYC approved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function rejectKyc(
  req,
  res
) {
  try {
    const { userId } =
      req.params;

    const {
      remarks,
      reason,
    } =
      req.body;

    const result =
      await rejectUserKyc(
        userId,
        remarks || reason
      );

    return res.status(200).json({
      success: true,
      message:
        "KYC rejected successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function updateCircuitBreaker(req, res) {
  try {
    const { symbol, tradingEnabled, reason } = req.body;
    if (typeof tradingEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "tradingEnabled must be a boolean",
      });
    }
    const control = await setTradingControl({
      symbol,
      tradingEnabled,
      reason,
      updatedBy: req.user.userId,
    });
    return res.status(200).json({ success: true, data: control });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function inspectOrderBook(req, res) {
  const depth = Math.max(1, Math.min(Number(req.query.depth) || 10, 50));
  return res.status(200).json({
    success: true,
    data: matchingEngine.getOrderBookSnapshot(
      String(req.params.symbol).trim().toUpperCase(),
      depth
    ),
  });
}

async function cancelOrderFromBook(req, res) {
  try {
    const order = await getLimitOrderById(req.params.id);
    if (!order || order.status !== "PENDING") {
      return res.status(404).json({ success: false, message: "Pending limit order not found" });
    }
    const cancelled = await removeLimitOrder(order.id, order.userId);
    return res.status(200).json({ success: true, data: cancelled });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function replayMarketSession(req, res) {
  try {
    const data = await replayTimeline(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getEngineeringMetrics(req, res) {
  try {
    const [activity, riskLatency, queue] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE event_type = 'ORDER_EXECUTED') AS trades_last_minute,
          COUNT(*) FILTER (WHERE event_type = 'RISK_APPROVED') AS approvals_last_minute,
          COUNT(*) FILTER (WHERE event_type = 'RISK_REJECTED') AS rejections_last_minute
         FROM audit_events
         WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'`
      ),
      pool.query(
        `SELECT
          percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
          percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99
         FROM risk_decisions
         WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'
           AND latency_ms IS NOT NULL`
      ),
      pool.query(
        `SELECT
          (SELECT COUNT(*) FROM limit_orders WHERE status = 'PENDING')
          + (SELECT COUNT(*) FROM stop_orders WHERE status = 'PENDING') AS queue_size`
      ),
    ]);
    const matching = matchingEngine.getMetrics();
    const risk = getRiskMetrics();
    const recent = activity.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        ordersPerSecond: Number(recent.approvals_last_minute || 0) / 60,
        tradesPerSecond: Number(recent.trades_last_minute || 0) / 60,
        riskRejectionsLastMinute: Number(recent.rejections_last_minute || 0),
        riskP95LatencyMs: riskLatency.rows[0].p95 === null ? null : Number(riskLatency.rows[0].p95),
        riskP99LatencyMs: riskLatency.rows[0].p99 === null ? null : Number(riskLatency.rows[0].p99),
        redisHitRatio: risk.redisHitRatio,
        redisReads: risk.redisReads,
        matchingEngine: matching,
        databaseQueueSize: Number(queue.rows[0].queue_size || 0),
        connectedWebSockets: getConnectedSocketCount(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  // stocks
  createStock,
  getStocks,
  deleteStock,

  // kyc
  getPendingKyc,
  getKyc,
  approveKyc,
  rejectKyc,
  updateCircuitBreaker,
  inspectOrderBook,
  cancelOrderFromBook,
  replayMarketSession,
  getEngineeringMetrics,
};
