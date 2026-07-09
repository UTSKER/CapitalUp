# Section: KYC Compliance and Verification
## Topic: KYC Submission, Document Uploads, and Verification Workflow

### Overview
CapitalUp requires a completed and approved KYC (Know Your Customer) record before allowing transactions like stock trading and fund withdrawals.

---

### Topic: Submitting KYC Details
- **Endpoint:** `POST /api/v1/kyc/` (Requires user login authentication)
- **Validation Schema (Zod Validation):**
  - `pan_full_name`: Full name matching the PAN card (min 3 characters).
  - `pan_number`: Permanent Account Number (regex format: 5 letters, 4 digits, 1 letter, e.g., `ABCDE1234F`).
  - `aadhaar_number`: Aadhaar identification number (must be exactly 12 digits).
  - `bank_account_number`: Bank account number for deposits/withdrawals (9 to 50 characters).
  - `bank_ifsc`: Bank Indian Financial System Code (regex format: 4 letters, `0`, and 6 alphanumeric digits, e.g., `SBIN0012345`).
  - `bank_name` / `account_holder`: Matching account strings.
  - `date_of_birth`: User birthdate (Format: YYYY-MM-DD).
  - `gender`: Required enum option ("Male", "Female", "Other").
  - `marital_status`: User marital status (max 30 characters).
  - `father_name` / `mother_name`: Parents' names (2 to 100 characters).
  - `occupation`: User's profession.
  - `annual_income`: Monthly/annual income bracket string.
  - `address` / `city` / `state` / `pincode`: Address parameters (pincode must be exactly 6 digits).

---

### Topic: KYC Document Image Uploads
- **Endpoint:** `POST /api/v1/kyc/documents`
- **Method:** `multipart/form-data`
- **Document Payload:**
  - `pan_document`: Uploaded image or PDF file of the user's PAN card.
  - `aadhaar_front`: Uploaded front face image of the Aadhaar card.
  - `aadhaar_back`: Uploaded back face image of the Aadhaar card.
  - `signature_document`: Uploaded copy of the user's signature.
- **Process Flow:**
  1. The user uploads documents via the frontend Multi-Step Form.
  2. The server intercepts documents, processes file sizes/formats, and uploads them to secure storage (such as Cloudinary or local assets).
  3. The database updates references to these file paths.
  4. The user's KYC status switches to `PENDING` review.

---

### Topic: Fetching KYC Status and Rejection Reasons
- **Endpoint:** `GET /api/v1/kyc/`
- **Response Format:**
  - Returns the current status of the KYC record (`UNSUBMITTED`, `PENDING`, `APPROVED`, or `REJECTED`), along with the `remarks` field containing comments if rejected.
- **Access Rule:**
  - Financial modules (like Withdrawals or Order Execution) intercept requests and query the user's KYC record. If the record is not `APPROVED`, execution fails with a "KYC validation required" error message.

---

### Topic: Troubleshooting and Error Scenarios
1. **User Query: "Why did my KYC fail?"**
   - **Reasoning from Code:** When an administrator rejects a KYC request (using `POST /api/v1/admin/kyc/:userId/reject`), they submit a comment. This comment is saved in the **`remarks`** column of the `kyc` database table.
   - **AI Response Strategy:** Query the user's KYC table row, read the value in the `remarks` column, and display it as the official reason for failure (e.g., "Your documents were rejected because the PAN card upload was blurry").
2. **Error: "Invalid PAN number format"**
   - **Reason:** The PAN string does not match the standard regex. It must contain 5 uppercase letters, followed by 4 digits, followed by 1 uppercase letter.
   - **Solution:** Verify the characters on the card and re-enter in uppercase (e.g., `ABCDE1234F`).
3. **Error: "Aadhaar must be exactly 12 digits"**
   - **Reason:** The Aadhaar string is too short, too long, or contains alphabetic characters.
   - **Solution:** Enter only the 12 numeric digits of your Aadhaar card.
4. **Error: "Invalid bank IFSC code"**
   - **Reason:** The bank IFSC code does not match the standard regex pattern (4 uppercase letters, followed by `0`, and 6 alphanumeric characters).
   - **Solution:** Verify your bank branch code (e.g., `UTIB0000245`).
5. **Error: "File too large" or "Unsupported file format"**
   - **Reason:** One or more files uploaded under `/documents` exceeds file size limits (typically 5MB) or is not a `.png`, `.jpg`, `.jpeg`, or `.pdf` file.
   - **Solution:** Compress the document images or convert them to standard JPEG/PNG format and re-upload.
6. **Error: "Verified identity fields cannot be modified"**
   - **Reason:** The user tried to update their PAN, Aadhaar, or Bank Account numbers after their KYC status was already approved by an administrator.
   - **Solution:** Contact customer support to request manual administrative updates.
7. **System / Database Failures (Technical Errors)**
   - **Reason:** Any database connection loss, internal service crash, file storage provider timeout, or unhandled server exception.
   - **User Presentation Rule:** Mask all low-level raw details. The AI must present this to the user simply as a **"technical error"** and advise them to retry in a few moments.
