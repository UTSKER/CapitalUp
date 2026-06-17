const express = require(
  "express"
);

const {
  create,
  getOrders,
  getOrder,
} = require(
  "../controllers/order.controller"
);

const authMiddleware = require(
  "../../../middlewares/auth.middleware.js"
);

const router =
  express.Router();

router.use(
  authMiddleware
);

router.post(
  "/",
  create
);

router.get(
  "/",
  getOrders
);

router.get(
  "/:id",
  getOrder
);

module.exports = router;