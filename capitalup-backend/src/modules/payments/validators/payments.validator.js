const { z } = require("zod");

const createDepositOrderSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().default("INR")
});

const verifyDepositSchema = z.object({
  razorpay_order_id: z.string().min(1, "Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required")
});

const initiateRefundSchema = z.object({
  depositId: z.string().min(1, "Deposit ID is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  reason: z.string().optional()
});

const requestWithdrawalSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  idempotencyKey: z.string().min(1, "Idempotency key is required")
});

const simulateWithdrawalPayoutSchema = z.object({
  withdrawalId: z.string().min(1, "Withdrawal ID is required"),
  status: z.enum(["SUCCESS", "FAILED"]),
  bankReference: z.string().optional()
});

module.exports = {
  createDepositOrderSchema,
  verifyDepositSchema,
  initiateRefundSchema,
  requestWithdrawalSchema,
  simulateWithdrawalPayoutSchema
};
