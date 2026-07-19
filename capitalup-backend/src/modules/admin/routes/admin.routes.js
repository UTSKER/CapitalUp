const express = require(
  "express"
);

const authenticate =
  require(
    "../../../middlewares/auth.middleware"
  );

const adminMiddleware =
  require(
    "../../../middlewares/admin.middleware"
  );

const {
  createStock,
  getStocks,
  deleteStock,
  getPendingKyc,
  getKyc,
  approveKyc,
  rejectKyc,
  updateCircuitBreaker,
  inspectOrderBook,
  cancelOrderFromBook,
  replayMarketSession,
  getEngineeringMetrics
} = require(
  "../controllers/admin.controller"
);

const router =
  express.Router();

router.use(
  authenticate
);

router.use(
  adminMiddleware
);

router.post(
  "/stocks",
  createStock
);

router.get(
  "/stocks",
  getStocks
);

router.delete(
  "/stocks/:symbol",
  deleteStock
);


// KYC Routes

router.get(
    "/kyc",getPendingKyc
);

router.get(
    "/kyc/:userId",getKyc
);

router.post(
    "/kyc/:userId/approve",approveKyc
);

router.post(
    "/kyc/:userId/reject",rejectKyc
);

router.post(
  "/risk/circuit-breaker",
  updateCircuitBreaker
);

router.get(
  "/order-book/:symbol",
  inspectOrderBook
);

router.delete(
  "/order-book/orders/:id",
  cancelOrderFromBook
);

router.get(
  "/replay",
  replayMarketSession
);

router.get(
  "/metrics",
  getEngineeringMetrics
);

module.exports = router;
