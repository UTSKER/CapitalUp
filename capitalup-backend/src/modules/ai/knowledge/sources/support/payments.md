# Section: Payments and Transactions
## Topic: Wallet Balances, Razorpay Deposits, Refunds, and Withdrawals

### Overview
This document specifies endpoints and security policies for funding wallets, executing withdrawals, and checking transaction ledgers.

---

### Topic: Razorpay Deposit Execution
- **Endpoints:**
  - Create Payment Order: `POST /api/v1/payments/deposits/create`
  - Verify Deposit Order: `POST /api/v1/payments/deposits/verify`
- **Verification Rule:**
  - Standard verification requires cryptographic signature validation. The backend generates a local signature using SHA256 HMAC of the combined `razorpay_order_id` and `razorpay_payment_id` with the secret webhook token, and verifies it matches the gateway header signature.

---

### Topic: Razorpay Webhook Event Listener
- **Endpoint:** `POST /api/v1/payments/webhook/razorpay` (Public endpoint)
- **Idempotency Rule:**
  - The server records every incoming webhook `eventId`. If a webhook arrives with an `eventId` that has already been marked as `processed` in the database, the operation is skipped to prevent double-crediting wallets.
- **Distributed Locking:**
  - The server acquires a Redis lock on the `orderId` during the webhook lifecycle to serialize processing and block race conditions.

---

### Topic: Releasing and Requesting Withdrawals
- **Endpoint:** `POST /api/v1/payments/withdrawals/request`
- **Validation Checks:**
  - **KYC Requirement:** Withdrawals are blocked unless the user's KYC status is strictly `APPROVED`.
  - **Balance Hold:** When a withdrawal is requested, the designated amount is instantly deducted from the user's `available_balance` and stored in a `hold_balance` field to prevent double-spending in other orders.
- **Payout Simulation:**
  - Admins or developers can simulate bank payout responses via `POST /api/v1/payments/withdrawals/simulate`.
  - **Payout Success:** The hold balance is permanently cleared.
  - **Payout Failure:** The locked money is returned to the user's available balance.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: "KYC verification is required before making withdrawals"**
   - **Reason:** The wallet withdrawal endpoint checks the user's KYC record. If the status is not `APPROVED` (meaning it is `PENDING`, `REJECTED`, or `UNSUBMITTED`), the transaction is blocked.
   - **Solution:** Complete your KYC verification and wait for admin approval.
2. **Error: "Order lock contention"**
   - **Reason:** Concurrent webhook notifications or client callbacks arrived at the exact same millisecond. One acquired the Redis lock, forcing the other to fail or wait.
   - **Solution:** Retry the action. If the order was already processed by the lock winner, your balance is already updated safely.
3. **Error: "Insufficient wallet balance to recover refund" or "Insufficient user balance to cover the refund debit"**
   - **Reason:** A refund was processed, but the user's available wallet balance has dropped below the amount being recovered.
   - **Solution:** Add funds to the wallet or contact support.
4. **Error: "Refund amount exceeds remaining deposit limit of X"**
   - **Reason:** You attempted to refund a deposit, but the requested refund amount is greater than the original deposit value (or the remaining un-refunded portion of it).
   - **Solution:** Reduce the refund amount to fit within the original transaction limits.
5. **Error: "Gateway refund API rejected request: X"**
   - **Reason:** The payment provider (Razorpay) rejected the refund call (e.g., due to insufficient merchant account funds or bank account limitations).
   - **Solution:** Verify merchant balance logs in Razorpay.
6. **Error: "Webhook order X not found"**
   - **Reason:** The webhook payload contains a Razorpay Order ID that has no matching entry in our PostgreSQL database.
   - **Solution:** Verify if the order was created on the local server or if it is from an external environment.
7. **Error: "Wallet not found"**
   - **Reason:** The system database lacks a corresponding `wallets` table entry for the active user ID.
   - **Solution:** Call the `getOrCreateWallet` service layer function to initialize the wallet structure automatically.
8. **Error: "Signature verification failed"**
   - **Reason:** The cryptographic hash generated using your `RAZORPAY_WEBHOOK_SECRET` does not match the signature provided in the headers, meaning the request was altered or sent by an unauthorized client.
   - **Solution:** Verify that your webhook secret matches the key configured on your Razorpay dashboard.
