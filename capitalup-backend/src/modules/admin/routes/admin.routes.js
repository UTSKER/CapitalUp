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
  rejectKyc
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

module.exports = router;
