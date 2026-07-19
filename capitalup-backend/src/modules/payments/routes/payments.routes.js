const express = require("express");
const controller = require("../controllers/payments.controller");
const authenticate = require("../../../middlewares/auth.middleware");

const router = express.Router();

// Webhook endpoint (must be public)
router.post("/webhook/razorpay", (req, res, next) => controller.handleRazorpayWebhook(req, res, next));

// Deposit Routes
router.post("/deposits/create", authenticate, (req, res, next) => controller.createDepositOrder(req, res, next));
router.post("/deposits/verify", authenticate, (req, res, next) => controller.verifyDeposit(req, res, next));

// Refund Routes
router.post("/refunds/initiate", authenticate, (req, res, next) => controller.initiateRefund(req, res, next));

// Withdrawal Routes
router.post("/withdrawals/request", authenticate, (req, res, next) => controller.requestWithdrawal(req, res, next));
router.post("/withdrawals/simulate", authenticate, (req, res, next) => controller.simulateWithdrawalPayout(req, res, next));

module.exports = router;
