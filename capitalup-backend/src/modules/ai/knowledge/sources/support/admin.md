# Section: Administrative Functions
## Topic: Stock Management, User Audits, and KYC Approvals

### Overview
This document describes administrative interfaces and operations. These endpoints are restricted to users with the role `ADMIN`.

---

### Topic: Authentication and Access Control
- **Middlewares:**
  - `authenticate`: Checks for a valid JWT access token.
  - `adminMiddleware`: Restricts access to users whose database role is strictly `ADMIN`. Requests from regular users will fail with a `403 Forbidden` error.

---

### Topic: Admin Stock Management
- **Endpoints:**
  - Create Stock Listing: `POST /api/v1/admin/stocks`
  - Get Admin Stock List: `GET /api/v1/admin/stocks`
  - Delete Stock Listing: `DELETE /api/v1/admin/stocks/:symbol`
- **Validation Rules:**
  - Creating a stock requires providing a valid ticker symbol, company name, asset type, and starting market price.
  - Deleting a stock listing removes its ticker from active trading.

---

### Topic: Administrative KYC Verification Workflow
- **Endpoints:**
  - Get Pending KYC Applications: `GET /api/v1/admin/kyc`
  - Get User KYC Details & Documents: `GET /api/v1/admin/kyc/:userId`
  - Approve KYC Application: `POST /api/v1/admin/kyc/:userId/approve`
  - Reject KYC Application: `POST /api/v1/admin/kyc/:userId/reject`
- **Process Flow:**
  1. Admins query pending submissions to view uploaded identity documents (PAN, Aadhaar).
  2. If details are correct, the admin approves the application, which updates the user's KYC status to `APPROVED` and unlocks trading and withdrawal actions.
  3. If documents are blurry or incorrect, the admin rejects the application (providing a rejection reason), resetting the user's KYC status to `REJECTED` so they can modify and resubmit details.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: "Forbidden: Access denied" (HTTP 403)**
   - **Reason:** The user authenticated successfully, but their database role is set to `USER` instead of `ADMIN`.
   - **Solution:** Access is prohibited. Ensure your user account role is upgraded to `ADMIN` in the database users table.
2. **Error: "KYC record not found"**
   - **Reason:** The specified `userId` in the parameters has not submitted any KYC form or does not exist.
   - **Solution:** Instruct the user to complete their KYC submission form.
3. **Error: "Cannot delete stock listing"**
   - **Reason:** The stock ticker has active open orders (limit or stop) in the database, preventing clean deletion.
   - **Solution:** Wait for active matching orders to clear, or cancel them manually before removing the listing.
