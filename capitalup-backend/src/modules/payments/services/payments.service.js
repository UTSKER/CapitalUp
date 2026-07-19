const crypto = require("crypto");
const Razorpay = require("razorpay");
const prisma = require("../../../config/prisma");
const repo = require("../repositories/payments.repository");
const { acquireLock, releaseLock } = require("../../../shared/utils/lock");
const { redisClient } = require("../../../config/redis");

const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_dummykeyid123";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "dummysecretkey123";
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "dummywebhooksecret123";

const isDummy = keyId.includes("dummy");
const razorpay = isDummy ? null : new Razorpay({ key_id: keyId, key_secret: keySecret });

class PaymentsService {
  
  // Ensure a wallet exists, create if missing, and synchronize users.balance
  async getOrCreateWallet(userId, tx = prisma) {
    let wallet = await repo.findWalletByUserId(userId, tx);
    if (!wallet) {
      // Initialize wallet with the user's current PostgreSQL balance to prevent resetting it to 0
      const user = await tx.users.findUnique({ where: { user_id: BigInt(userId) } });
      const startingBalance = user ? Number(user.balance) : 15000.00;

      wallet = await tx.wallets.create({
        data: {
          user_id: BigInt(userId),
          available_balance: startingBalance,
          hold_balance: 0.00,
          currency: "INR"
        }
      });
    }
    return wallet;
  }

  // Create Razorpay Order
  async createDepositOrder(userId, amount, currency = "INR") {
    // 1. Verify user exists
    const user = await prisma.users.findUnique({ where: { user_id: BigInt(userId) } });
    if (!user) throw new Error("User not found");

    // 2. Generate Razorpay order
    let rpOrderId;
    if (isDummy) {
      rpOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
    } else {
      try {
        const rpOrder = await razorpay.orders.create({
          amount: Math.round(amount * 100), // in paise
          currency: currency,
          receipt: `receipt_${userId}_${Date.now()}`
        });
        rpOrderId = rpOrder.id;
      } catch (err) {
        throw new Error(`Razorpay Order creation failed: ${err.message}`);
      }
    }

    // 3. Store Order in DB
    return prisma.$transaction(async (tx) => {
      await this.getOrCreateWallet(userId, tx);
      return repo.createPaymentOrder(userId, amount, currency, rpOrderId, tx);
    });
  }

  // Verify Deposit (Client Redirect Callback)
  async verifyDeposit(userId, payload) {
    throw new Error("Webhook not connected. Deposits must be processed via secure server-to-server webhook callback.");
  }

  // Webhook Signature Verification
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (isDummy) return true;
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    return expected === signatureHeader;
  }

  // Process Webhook Event
  async processWebhook(eventId, eventType, payload) {
    // 1. Record/Idempotency check for webhook event
    const lockAcquired = await acquireLock(`webhook:${eventId}`);
    if (!lockAcquired) {
      return { success: true, alreadyProcessed: true };
    }

    try {
      const existingEvent = await repo.findWebhookEvent(eventId);
      if (existingEvent && existingEvent.processed) {
        return { success: true, alreadyProcessed: true };
      }

      if (!existingEvent) {
        await repo.createWebhookEvent("Razorpay", eventId, eventType, payload);
      }

      if (eventType === "payment.captured") {
        const paymentObj = payload.payment.entity;
        const orderId = paymentObj.order_id;
        const paymentId = paymentObj.id;
        const amount = paymentObj.amount / 100; // to main currency units

        // Lock order key
        const orderLock = await acquireLock(orderId);
        if (!orderLock) throw new Error("Order lock contention");

        try {
          await prisma.$transaction(async (tx) => {
            const order = await repo.findPaymentOrderByOrderIdForUpdate(orderId, tx);
            if (!order) throw new Error(`Webhook order ${orderId} not found`);

            // If client redirect completed it, just mark webhook as processed and commit
            if (order.status === "PAID") {
              await repo.updateWebhookEventProcessed(eventId, tx);
              return;
            }

            const wallet = await repo.findWalletByUserIdForUpdate(order.user_id, tx);
            if (!wallet) throw new Error("Wallet not found");

            const deposit = await repo.createDeposit(
              order.user_id,
              wallet.id,
              order.id,
              paymentId,
              amount,
              paymentObj.method,
              paymentObj,
              tx
            );

            await repo.updatePaymentOrderStatus(orderId, "PAID", tx);

            const balanceBefore = wallet.available_balance;
            const newWallet = await repo.updateWalletBalances(wallet.id, amount, 0.00, tx);

            await tx.users.update({
              where: { user_id: order.user_id },
              data: { balance: newWallet.available_balance }
            });

            // Invalidate Redis cash balance cache
            try {
              await redisClient.del(`user:balance:${order.user_id}`);
            } catch (cacheErr) {
              console.error("Failed to clear balance cache on webhook capture:", cacheErr.message);
            }

            await repo.createLedgerTransaction(
              "DEPOSIT",
              deposit.id,
              `Completed deposit via Webhook payment ${paymentId}`,
              [
                {
                  walletId: wallet.id,
                  account: "ASSET:GATEWAY_RECONCILIATION",
                  entryType: "DEBIT",
                  amount: amount,
                  balanceBefore: 0.00,
                  balanceAfter: 0.00
                },
                {
                  walletId: wallet.id,
                  account: "LIABILITY:USER_WALLET",
                  entryType: "CREDIT",
                  amount: amount,
                  balanceBefore: balanceBefore,
                  balanceAfter: newWallet.available_balance
                }
              ],
              tx
            );

            await repo.updateWebhookEventProcessed(eventId, tx);
          });
        } finally {
          await releaseLock(orderId);
        }
      } else if (eventType === "refund.processed") {
        const refundObj = payload.refund.entity;
        const paymentId = refundObj.payment_id;
        const refundId = refundObj.id;
        const amount = refundObj.amount / 100;

        await prisma.$transaction(async (tx) => {
          const deposit = await repo.findDepositByPaymentId(paymentId, tx);
          if (!deposit) throw new Error(`Webhook original deposit not found for payment ${paymentId}`);

          const existingRefund = await repo.findRefundByRefundId(refundId, tx);
          if (existingRefund) {
            await repo.updateWebhookEventProcessed(eventId, tx);
            return;
          }

          const wallet = await repo.findWalletByUserIdForUpdate(deposit.user_id, tx);
          if (!wallet) throw new Error("Wallet not found");

          // Balance check for refund debit
          if (wallet.available_balance.toNumber() < amount) {
            throw new Error("Insufficient wallet balance to recover refund");
          }

          const refund = await repo.createRefund(deposit.id, deposit.user_id, refundId, amount, refundObj.notes?.reason || "Webhook process", "COMPLETED", tx);
          
          const balanceBefore = wallet.available_balance;
          const newWallet = await repo.updateWalletBalances(wallet.id, -amount, 0.00, tx);

          await tx.users.update({
            where: { user_id: deposit.user_id },
            data: { balance: newWallet.available_balance }
          });

          // Invalidate Redis cash balance cache
          try {
            await redisClient.del(`user:balance:${deposit.user_id}`);
          } catch (cacheErr) {
            console.error("Failed to clear balance cache on webhook refund:", cacheErr.message);
          }

          await repo.createLedgerTransaction(
            "REFUND",
            refund.id,
            `Processed refund webhook ${refundId}`,
            [
              {
                walletId: wallet.id,
                account: "LIABILITY:USER_WALLET",
                entryType: "DEBIT",
                amount: amount,
                balanceBefore: balanceBefore,
                balanceAfter: newWallet.available_balance
              },
              {
                walletId: wallet.id,
                account: "ASSET:GATEWAY_RECONCILIATION",
                entryType: "CREDIT",
                amount: amount,
                balanceBefore: 0.00,
                balanceAfter: 0.00
              }
            ],
            tx
          );

          await repo.updateWebhookEventProcessed(eventId, tx);
        });
      } else {
        // Unknown or ignore event
        await repo.updateWebhookEventProcessed(eventId);
      }

      return { success: true };
    } finally {
      await releaseLock(`webhook:${eventId}`);
    }
  }

  // Initiate Refund (Admin/System initiated)
  async initiateRefund(userId, depositId, amount, reason) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock original deposit
      const deposit = await repo.findDepositByIdForUpdate(depositId, tx);
      if (!deposit) throw new Error("Deposit not found");

      // 2. Validate refund limit
      const alreadyRefunded = await repo.getRefundedAmountSum(depositId, tx);
      const remainingLimit = deposit.amount.toNumber() - Number(alreadyRefunded);
      if (amount > remainingLimit) {
        throw new Error(`Refund amount exceeds remaining deposit limit of ${remainingLimit}`);
      }

      // 3. Lock user wallet & verify available balance
      const wallet = await repo.findWalletByUserIdForUpdate(deposit.user_id, tx);
      if (!wallet) throw new Error("Wallet not found");
      if (wallet.available_balance.toNumber() < amount) {
        throw new Error("Insufficient user balance to cover the refund debit");
      }

      // 4. Initiate Razorpay gateway refund
      let refundId;
      if (isDummy) {
        refundId = `rfnd_${crypto.randomBytes(8).toString("hex")}`;
      } else {
        try {
          const rpRefund = await razorpay.payments.refund(deposit.razorpay_payment_id, {
            amount: Math.round(amount * 100),
            notes: { reason }
          });
          refundId = rpRefund.id;
        } catch (err) {
          throw new Error(`Gateway refund API rejected request: ${err.message}`);
        }
      }

      // 5. Save refund record
      const refund = await repo.createRefund(deposit.id, deposit.user_id, refundId, amount, reason, "COMPLETED", tx);

      // 6. Update balances & sync legacy
      const balanceBefore = wallet.available_balance;
      const newWallet = await repo.updateWalletBalances(wallet.id, -amount, 0.00, tx);

      await tx.users.update({
        where: { user_id: deposit.user_id },
        data: { balance: newWallet.available_balance }
      });

      // Invalidate Redis cash balance cache
      try {
        await redisClient.del(`user:balance:${deposit.user_id}`);
      } catch (cacheErr) {
        console.error("Failed to clear balance cache on manual refund:", cacheErr.message);
      }

      // 7. Write Ledger (Debit user liability, Credit gateway asset)
      await repo.createLedgerTransaction(
        "REFUND",
        refund.id,
        `Initiated manual refund ${refundId} on payment ${deposit.razorpay_payment_id}`,
        [
          {
            walletId: wallet.id,
            account: "LIABILITY:USER_WALLET",
            entryType: "DEBIT",
            amount: amount,
            balanceBefore: balanceBefore,
            balanceAfter: newWallet.available_balance
          },
          {
            walletId: wallet.id,
            account: "ASSET:GATEWAY_RECONCILIATION",
            entryType: "CREDIT",
            amount: amount,
            balanceBefore: 0.00,
            balanceAfter: 0.00
          }
        ],
        tx
      );

      return refund;
    });
  }

  // Request Withdrawal (Fiat out to Bank Account)
  async requestWithdrawal(userId, amount, idempotencyKey) {
    // 1. Deduplicate request using Idempotency Key
    const existing = await repo.findWithdrawalByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { alreadyProcessed: true, withdrawal: existing };
    }

    return prisma.$transaction(async (tx) => {
      // 2. Lock user wallet
      const wallet = await this.getOrCreateWallet(userId, tx);
      const lockedWallet = await repo.findWalletByUserIdForUpdate(userId, tx);

      // 3. KYC validation check
      const kycRecord = await tx.kyc.findUnique({ where: { user_id: BigInt(userId) } });
      if (!kycRecord || kycRecord.kyc_status !== "APPROVED") {
        throw new Error("KYC verification is required before making withdrawals");
      }

      // 4. Balance validation
      if (lockedWallet.available_balance.toNumber() < amount) {
        throw new Error("Insufficient available balance for withdrawal");
      }

      // 5. Create withdrawal request
      const withdrawal = await repo.createWithdrawal(userId, lockedWallet.id, amount, idempotencyKey, tx);

      // 6. Lock funds (debit available balance, credit hold balance)
      const balanceBefore = lockedWallet.available_balance;
      const holdBefore = lockedWallet.hold_balance;
      
      const newWallet = await repo.updateWalletBalances(lockedWallet.id, -amount, amount, tx);

      // Sync legacy available balance
      await tx.users.update({
        where: { user_id: BigInt(userId) },
        data: { balance: newWallet.available_balance }
      });

      // Invalidate Redis cash balance cache
      try {
        await redisClient.del(`user:balance:${userId}`);
      } catch (cacheErr) {
        console.error("Failed to clear balance cache on withdrawal request:", cacheErr.message);
      }

      // 7. Write Ledger (Liability Available -> Liability Hold)
      await repo.createLedgerTransaction(
        "WITHDRAWAL",
        withdrawal.id,
        `Withdrawal request initialized (funds held). Ref ID: ${withdrawal.id}`,
        [
          {
            walletId: lockedWallet.id,
            account: "LIABILITY:USER_WALLET",
            entryType: "DEBIT",
            amount: amount,
            balanceBefore: balanceBefore,
            balanceAfter: newWallet.available_balance
          },
          {
            walletId: lockedWallet.id,
            account: "LIABILITY:USER_HOLD",
            entryType: "CREDIT",
            amount: amount,
            balanceBefore: holdBefore,
            balanceAfter: newWallet.hold_balance
          }
        ],
        tx
      );

      return { success: true, withdrawal };
    });
  }

  // Simulate Withdrawal Status Update (Approval/Success or Reject/Failure)
  async updateWithdrawalPayoutStatus(withdrawalId, status, bankReference = "TXN-SIMULATED") {
    return prisma.$transaction(async (tx) => {
      const withdrawal = await repo.findWithdrawalByIdForUpdate(withdrawalId, tx);
      if (!withdrawal) throw new Error("Withdrawal not found");
      if (withdrawal.status !== "PENDING" && withdrawal.status !== "PROCESSING") {
        throw new Error(`Withdrawal has already been finalized with status ${withdrawal.status}`);
      }

      const wallet = await repo.findWalletByUserIdForUpdate(withdrawal.user_id, tx);
      if (!wallet) throw new Error("Wallet not found");

      if (status === "SUCCESS") {
        // Clear hold balance
        const holdBefore = wallet.hold_balance;
        const newWallet = await repo.updateWalletBalances(wallet.id, 0.00, -withdrawal.amount, tx);

        await repo.updateWithdrawalStatus(withdrawalId, "SUCCESS", bankReference, tx);

        // Write Ledger (Liability Hold -> Nodal Bank Asset credit)
        await repo.createLedgerTransaction(
          "WITHDRAWAL",
          withdrawalId,
          `Withdrawal payout succeeded. Ref: ${bankReference}`,
          [
            {
              walletId: wallet.id,
              account: "LIABILITY:USER_HOLD",
              entryType: "DEBIT",
              amount: withdrawal.amount,
              balanceBefore: holdBefore,
              balanceAfter: newWallet.hold_balance
            },
            {
              walletId: wallet.id,
              account: "ASSET:BANK",
              entryType: "CREDIT",
              amount: withdrawal.amount,
              balanceBefore: 0.00,
              balanceAfter: 0.00
            }
          ],
          tx
        );
      } else if (status === "FAILED") {
        // Release hold back to available balance
        const balanceBefore = wallet.available_balance;
        const holdBefore = wallet.hold_balance;
        
        const newWallet = await repo.updateWalletBalances(wallet.id, withdrawal.amount, -withdrawal.amount, tx);

        // Sync legacy balance
        await tx.users.update({
          where: { user_id: withdrawal.user_id },
          data: { balance: newWallet.available_balance }
        });

        // Invalidate Redis cash balance cache
        try {
          await redisClient.del(`user:balance:${withdrawal.user_id}`);
        } catch (cacheErr) {
          console.error("Failed to clear balance cache on withdrawal failed reversal:", cacheErr.message);
        }

        await repo.updateWithdrawalStatus(withdrawalId, "FAILED", bankReference, tx);

        // Write Ledger (Liability Hold -> Liability Available)
        await repo.createLedgerTransaction(
          "WITHDRAWAL",
          withdrawalId,
          `Withdrawal payout failed. Funds returned to wallet. Ref: ${bankReference}`,
          [
            {
              walletId: wallet.id,
              account: "LIABILITY:USER_HOLD",
              entryType: "DEBIT",
              amount: withdrawal.amount,
              balanceBefore: holdBefore,
              balanceAfter: newWallet.hold_balance
            },
            {
              walletId: wallet.id,
              account: "LIABILITY:USER_WALLET",
              entryType: "CREDIT",
              amount: withdrawal.amount,
              balanceBefore: balanceBefore,
              balanceAfter: newWallet.available_balance
            }
          ],
          tx
        );
      }

      return { success: true };
    });
  }
}

module.exports = new PaymentsService();
