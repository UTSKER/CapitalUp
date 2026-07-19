const service = require("../services/payments.service");
const validators = require("../validators/payments.validator");

class PaymentsController {
  
  // CREATE DEPOSIT ORDER (Razorpay Order creation)
  async createDepositOrder(req, res) {
    try {
      const parsed = validators.createDepositOrderSchema.parse(req.body);
      const userId = req.user.userId;
      
      const order = await service.createDepositOrder(userId, parsed.amount, parsed.currency);
      // Uncomment to print order creation logs:
      // console.log(`[Deposit Order Created] User ID: ${userId}, Amount: ${parsed.amount}, Order ID: ${order.razorpay_order_id}`);
      
      return res.status(201).json({
        success: true,
        data: {
          ...order,
          keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_dummykeyid123"
        }
      });
    } catch (err) {
      console.error("Create Deposit Order Error:", err);
      const isZod = err.errors ? true : false;
      return res.status(isZod ? 400 : 500).json({
        success: false,
        message: isZod ? err.errors[0].message : err.message
      });
    }
  }

  // VERIFY DEPOSIT (Client-side callback signature check & execution)
  async verifyDeposit(req, res) {
    try {
      const parsed = validators.verifyDepositSchema.parse(req.body);
      const userId = req.user.userId;

      // Uncomment to print payment verification logs:
      // console.log(`[Deposit Verification Request] User ID: ${userId}, Order ID: ${parsed.razorpay_order_id}, Payment ID: ${parsed.razorpay_payment_id}`);

      const result = await service.verifyDeposit(userId, parsed);

      return res.status(200).json({
        success: true,
        message: result.alreadyProcessed ? "Payment already processed successfully" : "Payment verified and credited successfully",
        data: result.deposit
      });
    } catch (err) {
      console.error("Verify Deposit Error:", err);
      const isZod = err.errors ? true : false;
      return res.status(isZod ? 400 : 400).json({ // Return 400 for business validation/signature failures
        success: false,
        message: isZod ? err.errors[0].message : err.message
      });
    }
  }

  // INITIATE REFUND (Admin/System action)
  async initiateRefund(req, res) {
    try {
      const parsed = validators.initiateRefundSchema.parse(req.body);
      const userId = req.user.userId;

      const refund = await service.initiateRefund(userId, parsed.depositId, parsed.amount, parsed.reason);

      return res.status(200).json({
        success: true,
        message: "Refund processed successfully",
        data: refund
      });
    } catch (err) {
      console.error("Initiate Refund Error:", err);
      const isZod = err.errors ? true : false;
      return res.status(isZod ? 400 : 400).json({
        success: false,
        message: isZod ? err.errors[0].message : err.message
      });
    }
  }

  // REQUEST WITHDRAWAL (Wallet hold logic)
  async requestWithdrawal(req, res) {
    try {
      const parsed = validators.requestWithdrawalSchema.parse(req.body);
      const userId = req.user.userId;

      const result = await service.requestWithdrawal(userId, parsed.amount, parsed.idempotencyKey);

      return res.status(201).json({
        success: true,
        message: result.alreadyProcessed ? "Withdrawal already requested" : "Withdrawal requested and funds held successfully",
        data: result.withdrawal
      });
    } catch (err) {
      console.error("Request Withdrawal Error:", err);
      const isZod = err.errors ? true : false;
      return res.status(isZod ? 400 : 400).json({
        success: false,
        message: isZod ? err.errors[0].message : err.message
      });
    }
  }

  // SIMULATE WITHDRAWAL PAYOUT (Admin/Test tool to settle/reject withdrawal)
  async simulateWithdrawalPayout(req, res) {
    try {
      const parsed = validators.simulateWithdrawalPayoutSchema.parse(req.body);

      await service.updateWithdrawalPayoutStatus(parsed.withdrawalId, parsed.status, parsed.bankReference);

      return res.status(200).json({
        success: true,
        message: `Simulated withdrawal payout status successfully set to: ${parsed.status}`
      });
    } catch (err) {
      console.error("Simulate Withdrawal Payout Error:", err);
      const isZod = err.errors ? true : false;
      return res.status(isZod ? 400 : 400).json({
        success: false,
        message: isZod ? err.errors[0].message : err.message
      });
    }
  }

  // WEBHOOK HANDLER (Razorpay gateway webhook endpoint)
  async handleRazorpayWebhook(req, res) {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody; // Assumes raw-body parsing middleware is available or populated

    try {
      // signature validation
      const verified = service.verifyWebhookSignature(rawBody || JSON.stringify(req.body), signature);
      if (!verified) {
        return res.status(400).json({ success: false, message: "Invalid webhook signature" });
      }

      const event = req.body.event;
      const eventId = req.body.id;
      const payload = req.body.payload;

      // Uncomment to print incoming webhook events:
      // console.log(`[Razorpay Webhook Received] Event: ${event}, ID: ${eventId}`);
      // console.log("Webhook Payload:", JSON.stringify(payload, null, 2));

      await service.processWebhook(eventId, event, payload);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Razorpay Webhook Processing Error:", err.message);
      // Return 200/400 appropriately. If signature matches but internal db fails,
      // we still return 200 or 500 depending on gateway retry requirements. 
      // Return 400 for structural payload errors.
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }
}

module.exports = new PaymentsController();
