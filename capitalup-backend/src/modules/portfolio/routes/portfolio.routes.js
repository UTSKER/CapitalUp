const express = require(
  "express"
);

const {
  buy,
  sell,
  getUserPortfolio,
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

module.exports = router;