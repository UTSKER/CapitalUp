const prisma = require("../../../config/prisma");

class PaymentsRepository {
  // WALLETS
  async findWalletByUserId(userId, tx = prisma) {
    return tx.wallets.findUnique({
      where: { user_id: BigInt(userId) }
    });
  }

  // Row lock on wallet by user ID to prevent race conditions
  async findWalletByUserIdForUpdate(userId, tx = prisma) {
    const rawWallets = await tx.$queryRaw`
      SELECT * FROM "wallets" 
      WHERE "user_id" = ${BigInt(userId)} 
      FOR UPDATE
    `;
    return rawWallets[0] || null;
  }

  async createWallet(userId, tx = prisma) {
    return tx.wallets.create({
      data: {
        user_id: BigInt(userId),
        available_balance: 0.00,
        hold_balance: 0.00,
        currency: "INR"
      }
    });
  }

  async updateWalletBalances(walletId, availableChange, holdChange, tx = prisma) {
    return tx.wallets.update({
      where: { id: BigInt(walletId) },
      data: {
        available_balance: { increment: availableChange },
        hold_balance: { increment: holdChange }
      }
    });
  }

  // PAYMENT ORDERS
  async createPaymentOrder(userId, amount, currency, orderId, tx = prisma) {
    return tx.payment_orders.create({
      data: {
        user_id: BigInt(userId),
        razorpay_order_id: orderId,
        amount: amount,
        currency: currency || "INR",
        status: "PENDING"
      }
    });
  }

  async findPaymentOrderByOrderId(orderId, tx = prisma) {
    return tx.payment_orders.findUnique({
      where: { razorpay_order_id: orderId }
    });
  }

  // Row lock on payment order by Razorpay Order ID to serialize status transitions
  async findPaymentOrderByOrderIdForUpdate(orderId, tx = prisma) {
    const rawOrders = await tx.$queryRaw`
      SELECT * FROM "payment_orders"
      WHERE "razorpay_order_id" = ${orderId}
      FOR UPDATE
    `;
    return rawOrders[0] || null;
  }

  async updatePaymentOrderStatus(orderId, status, tx = prisma) {
    return tx.payment_orders.update({
      where: { razorpay_order_id: orderId },
      data: { status }
    });
  }

  // DEPOSITS
  async createDeposit(userId, walletId, orderId, paymentId, amount, method, response, tx = prisma) {
    return tx.deposits.create({
      data: {
        user_id: BigInt(userId),
        wallet_id: BigInt(walletId),
        payment_order_id: BigInt(orderId),
        razorpay_payment_id: paymentId,
        amount: amount,
        status: "COMPLETED",
        payment_method: method,
        gateway_response: response
      }
    });
  }

  async findDepositByPaymentId(paymentId, tx = prisma) {
    return tx.deposits.findUnique({
      where: { razorpay_payment_id: paymentId }
    });
  }

  async findDepositById(depositId, tx = prisma) {
    return tx.deposits.findUnique({
      where: { id: BigInt(depositId) }
    });
  }

  async findDepositByIdForUpdate(depositId, tx = prisma) {
    const rawDeposits = await tx.$queryRaw`
      SELECT * FROM "deposits"
      WHERE "id" = ${BigInt(depositId)}
      FOR UPDATE
    `;
    return rawDeposits[0] || null;
  }

  // REFUNDS
  async createRefund(depositId, userId, refundId, amount, reason, status, tx = prisma) {
    return tx.refunds.create({
      data: {
        deposit_id: BigInt(depositId),
        user_id: BigInt(userId),
        razorpay_refund_id: refundId,
        amount: amount,
        reason: reason,
        status: status || "COMPLETED"
      }
    });
  }

  async findRefundByRefundId(refundId, tx = prisma) {
    return tx.refunds.findUnique({
      where: { razorpay_refund_id: refundId }
    });
  }

  async getRefundedAmountSum(depositId, tx = prisma) {
    const aggregate = await tx.refunds.aggregate({
      where: {
        deposit_id: BigInt(depositId),
        status: { in: ["COMPLETED", "PENDING"] }
      },
      _sum: { amount: true }
    });
    return aggregate._sum.amount || 0;
  }

  // WITHDRAWALS
  async createWithdrawal(userId, walletId, amount, idempotencyKey, tx = prisma) {
    return tx.withdrawals.create({
      data: {
        user_id: BigInt(userId),
        wallet_id: BigInt(walletId),
        amount: amount,
        status: "PENDING",
        idempotency_key: idempotencyKey
      }
    });
  }

  async findWithdrawalByIdempotencyKey(key, tx = prisma) {
    return tx.withdrawals.findUnique({
      where: { idempotency_key: key }
    });
  }

  async findWithdrawalByIdForUpdate(id, tx = prisma) {
    const rawWithdrawals = await tx.$queryRaw`
      SELECT * FROM "withdrawals"
      WHERE "id" = ${BigInt(id)}
      FOR UPDATE
    `;
    return rawWithdrawals[0] || null;
  }

  async updateWithdrawalStatus(id, status, bankReference, tx = prisma) {
    return tx.withdrawals.update({
      where: { id: BigInt(id) },
      data: {
        status,
        bank_reference: bankReference,
        updated_at: new Date()
      }
    });
  }

  // DOUBLE-ENTRY LEDGER
  async createLedgerTransaction(refType, refId, description, entries, tx = prisma) {
    const ledgerTx = await tx.ledger_transactions.create({
      data: {
        reference_type: refType,
        reference_id: BigInt(refId),
        description
      }
    });

    const entriesData = entries.map(entry => ({
      transaction_id: ledgerTx.id,
      wallet_id: BigInt(entry.walletId),
      account: entry.account,
      entry_type: entry.entryType,
      amount: entry.amount,
      balance_before: entry.balanceBefore,
      balance_after: entry.balanceAfter
    }));

    await tx.ledger_entries.createMany({
      data: entriesData
    });

    return ledgerTx;
  }

  // WEBHOOK EVENTS DEDUPLICATION
  async createWebhookEvent(gateway, eventId, eventType, payload, tx = prisma) {
    return tx.webhook_events.create({
      data: {
        gateway,
        event_id: eventId,
        event_type: eventType,
        payload,
        processed: false
      }
    });
  }

  async findWebhookEvent(eventId, tx = prisma) {
    return tx.webhook_events.findUnique({
      where: { event_id: eventId }
    });
  }

  // Lock raw webhook log for processing
  async findWebhookEventForUpdate(eventId, tx = prisma) {
    const rawEvents = await tx.$queryRaw`
      SELECT * FROM "webhook_events"
      WHERE "event_id" = ${eventId}
      FOR UPDATE
    `;
    return rawEvents[0] || null;
  }

  async updateWebhookEventProcessed(eventId, tx = prisma) {
    return tx.webhook_events.update({
      where: { event_id: eventId },
      data: {
        processed: true,
        processed_at: new Date()
      }
    });
  }
}

module.exports = new PaymentsRepository();
