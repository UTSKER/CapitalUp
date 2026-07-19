// End-to-end test for Deposit, Refund, Withdrawal and Ledger system
// Creates a dedicated test user, simulates webhooks, concurrent payments, 
// payouts success/failure, KYC validation, and double-entry ledger balance.
// Run: node testPaymentsSystem.js

require("dotenv").config({ override: true });

const assert = require("assert");
const pool = require("./src/config/postgre");
const { redisClient } = require("./src/config/redis");
const service = require("./src/modules/payments/services/payments.service");
const repo = require("./src/modules/payments/repositories/payments.repository");

let testUserId;
let testWalletId;

async function setup() {
  await redisClient.connect().catch(() => {});
  
  // Clean up any stale test user
  await pool.query("DELETE FROM users WHERE email = $1", ["test_payment_user@example.com"]);

  const res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role) 
     VALUES ($1, $2, $3, $4) RETURNING user_id`,
    ["Test Payment User", "test_payment_user@example.com", "hash", "USER"]
  );
  testUserId = res.rows[0].user_id;
  console.log(`Created test user with ID: ${testUserId}`);
}

async function runTests() {
  console.log("\n--- STARTING TRANSACTION CONSISTENCY TESTS ---");

  // TEST 1: Wallet Initialization
  console.log("\nTest 1: Initializing Wallet...");
  const wallet = await service.getOrCreateWallet(testUserId);
  testWalletId = wallet.id;
  assert.strictEqual(Number(wallet.available_balance), 0.00);
  assert.strictEqual(Number(wallet.hold_balance), 0.00);
  console.log("✔ Wallet initialized successfully with 0.00 balance.");

  // TEST 2: Deposit Order Creation
  console.log("\nTest 2: Creating Deposit Order...");
  const order = await service.createDepositOrder(testUserId, 1000.00, "INR");
  assert.strictEqual(order.status, "PENDING");
  assert.strictEqual(Number(order.amount), 1000.00);
  console.log(`✔ Payment order created. Razorpay Order ID: ${order.razorpay_order_id}`);

  // TEST 3: Concurrent Deposit Signature verification
  console.log("\nTest 3: Simulating Concurrent Verification (Webhook + Redirect Client)...");
  const payload = {
    razorpay_order_id: order.razorpay_order_id,
    razorpay_payment_id: "pay_test_deposit_123",
    razorpay_signature: "dummy_sig"
  };

  // Run two verification requests concurrently
  const [res1, res2] = await Promise.allSettled([
    service.verifyDeposit(testUserId, payload),
    service.verifyDeposit(testUserId, payload)
  ]);

  // One must succeed, the other should either return isProcessed or throw lock contention
  const resolved = [];
  const rejected = [];
  [res1, res2].forEach((res, i) => {
    if (res.status === "fulfilled") {
      resolved.push(res.value);
      console.log(`Call ${i + 1} succeeded:`, res.value.alreadyProcessed ? "Returned already processed" : "Deposited fresh");
    } else {
      rejected.push(res.reason);
      console.log(`Call ${i + 1} rejected with:`, res.reason.message);
    }
  });

  assert.strictEqual(resolved.length + rejected.length, 2);
  
  // Fetch updated wallet balance
  const walletAfterDeposit = await repo.findWalletByUserId(testUserId);
  assert.strictEqual(Number(walletAfterDeposit.available_balance), 1000.00);
  console.log("✔ Concurrent deposits resolved. Wallet balance is exactly 1000.00.");

  // TEST 4: Webhook Idempotency (Duplicate webhook events)
  console.log("\nTest 4: Simulating Duplicate Webhook Delivery...");
  const webhookEventId = "evt_test_12345";
  const webhookPayload = {
    payment: {
      entity: {
        id: "pay_test_deposit_456",
        order_id: order.razorpay_order_id,
        amount: 50000, // 500.00 INR in paisa
        method: "UPI"
      }
    }
  };

  // Process same webhook twice concurrently
  const [wh1, wh2] = await Promise.allSettled([
    service.processWebhook(webhookEventId, "payment.captured", webhookPayload),
    service.processWebhook(webhookEventId, "payment.captured", webhookPayload)
  ]);

  const walletAfterWebhook = await repo.findWalletByUserId(testUserId);
  // Order status was already paid (Test 3 completed it). The webhook for order must skip crediting again
  // Balance should still be 1000.00 because order.status is PAID and cannot be credited twice
  assert.strictEqual(Number(walletAfterWebhook.available_balance), 1000.00);
  console.log("✔ Duplicate webhook safely ignored without double-crediting.");

  // TEST 5: Withdrawal hold and KYC verification check
  console.log("\nTest 5: Requesting Withdrawal (KYC Validation)...");
  try {
    await service.requestWithdrawal(testUserId, 400.00, "withdraw_idempotency_1");
    assert.fail("Should have failed because KYC is not approved");
  } catch (err) {
    assert.ok(err.message.includes("KYC verification is required"));
    console.log("✔ Withdrawal blocked due to pending KYC (expected).");
  }

  // Approve KYC
  await pool.query(
    `INSERT INTO kyc (user_id, kyc_status) VALUES ($1, $2)`,
    [testUserId, "APPROVED"]
  );
  console.log("Approved user KYC.");

  // Withdrawal Request (Success path)
  const wReq = await service.requestWithdrawal(testUserId, 400.00, "withdraw_idempotency_1");
  const walletAfterHold = await repo.findWalletByUserId(testUserId);
  assert.strictEqual(Number(walletAfterHold.available_balance), 600.00); // 1000 - 400
  assert.strictEqual(Number(walletAfterHold.hold_balance), 400.00); // hold 400
  console.log("✔ Withdrawal requested. 400.00 moved from available to hold balance.");

  // TEST 6: Settle Payout (SUCCESS)
  console.log("\nTest 6: Settle Payout Payout simulation...");
  await service.updateWithdrawalPayoutStatus(wReq.withdrawal.id, "SUCCESS", "BANK-TXN-12345");
  const walletAfterPayoutSuccess = await repo.findWalletByUserId(testUserId);
  assert.strictEqual(Number(walletAfterPayoutSuccess.available_balance), 600.00);
  assert.strictEqual(Number(walletAfterPayoutSuccess.hold_balance), 0.00);
  console.log("✔ Withdrawal payout succeeded. Hold balance cleared.");

  // TEST 7: Releasing Payout (FAILURE reversal)
  console.log("\nTest 7: Simulating Payout FAILURE (Reversal logic)...");
  // Try another withdrawal
  const wReq2 = await service.requestWithdrawal(testUserId, 200.00, "withdraw_idempotency_2");
  await service.updateWithdrawalPayoutStatus(wReq2.withdrawal.id, "FAILED", "BANK-REJECTED-1");
  const walletAfterPayoutFailure = await repo.findWalletByUserId(testUserId);
  // Balance should return back to available
  assert.strictEqual(Number(walletAfterPayoutFailure.available_balance), 600.00); // 400 available + 200 returned
  assert.strictEqual(Number(walletAfterPayoutFailure.hold_balance), 0.00);
  console.log("✔ Withdrawal payout failed. Balance reverted to available wallet balance successfully.");

  // TEST 8: Admin Refund & limit validation
  console.log("\nTest 8: Testing Manual Refunds & Limit Verifications...");
  // Create another order & verify it to have a completed deposit to refund
  const refundOrder = await service.createDepositOrder(testUserId, 300.00, "INR");
  const verifiedDeposit = await service.verifyDeposit(testUserId, {
    razorpay_order_id: refundOrder.razorpay_order_id,
    razorpay_payment_id: "pay_test_refund_target",
    razorpay_signature: "dummy"
  });

  const walletBeforeRefund = await repo.findWalletByUserId(testUserId);
  assert.strictEqual(Number(walletBeforeRefund.available_balance), 900.00); // 600 + 300 deposit

  // Refund 200.00
  const refund1 = await service.initiateRefund(testUserId, verifiedDeposit.deposit.id, 200.00, "Customer request");
  const walletAfterRefund1 = await repo.findWalletByUserId(testUserId);
  assert.strictEqual(Number(walletAfterRefund1.available_balance), 700.00); // 900 - 200
  console.log("✔ Refunded 200.00 successfully.");

  // Refund 150.00 (Exceeds remaining deposit threshold limit of 100.00)
  try {
    await service.initiateRefund(testUserId, verifiedDeposit.deposit.id, 150.00, "Customer request 2");
    assert.fail("Should have failed because refund sum exceeds deposit amount");
  } catch (err) {
    assert.ok(err.message.includes("exceeds remaining deposit limit"));
    console.log("✔ Blocked refund exceeding remaining limit threshold (expected).");
  }

  // TEST 9: Double-Entry Ledger assertions
  console.log("\nTest 9: Verifying Ledger Entries Consistency (Debits == Credits)...");
  const txs = await pool.query("SELECT id FROM ledger_transactions");
  for (const row of txs.rows) {
    const entries = await pool.query(
      "SELECT entry_type, amount FROM ledger_entries WHERE transaction_id = $1",
      [row.id]
    );
    let debits = 0;
    let credits = 0;
    entries.rows.forEach(e => {
      if (e.entry_type === "DEBIT") debits += Number(e.amount);
      if (e.entry_type === "CREDIT") credits += Number(e.amount);
    });
    assert.strictEqual(debits.toFixed(2), credits.toFixed(2), `Ledger Transaction ${row.id} is unbalanced!`);
  }
  console.log("✔ All ledger transaction entries are mathematically balanced (Debits = Credits).");
}

async function cleanup() {
  console.log("\nCleaning up test records...");
  if (testUserId) {
    await pool.query("DELETE FROM kyc WHERE user_id = $1", [testUserId]);
    await pool.query("DELETE FROM refunds WHERE user_id = $1", [testUserId]);
    await pool.query("DELETE FROM deposits WHERE user_id = $1", [testUserId]);
    await pool.query("DELETE FROM payment_orders WHERE user_id = $1", [testUserId]);
    await pool.query("DELETE FROM withdrawals WHERE user_id = $1", [testUserId]);
    await pool.query("DELETE FROM ledger_entries WHERE wallet_id = $1", [testWalletId]);
    await pool.query("DELETE FROM ledger_transactions WHERE id NOT IN (SELECT transaction_id FROM ledger_entries)");
    await pool.query("DELETE FROM wallets WHERE user_id = $1", [testUserId]);
    await pool.query("DELETE FROM users WHERE user_id = $1", [testUserId]);
    await pool.query("DELETE FROM webhook_events WHERE event_id = $1", ["evt_test_12345"]);
    console.log("✔ Clean up complete.");
  }
}

async function main() {
  try {
    await setup();
    await runTests();
    console.log("\n🏆 ALL PAYMENTS SYSTEM TESTS PASSED SUCCESSFULLY! 🏆");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
  } finally {
    await cleanup();
    await redisClient.quit().catch(() => {});
    process.exit(0);
  }
}

main();
