const express = require(
  "express"
);

const {
  buy,
  sell,
  getUserPortfolio,
  getPerformance,
  getTopMovers,
} = require(
  "../controllers/portfolio.controller"
);

const authMiddleware = require(
  "../../../middlewares/auth.middleware.js"
);

const router =
  express.Router();

router.use(
  authMiddleware
);

router.get(
  "/",
  getUserPortfolio
);

router.get(
  "/performance",
  getPerformance
);

router.get(
  "/top-movers",
  getTopMovers
);

module.exports = router;