# Section: User Profile Management
## Topic: Personal Information, KYC Reference, and Bank Account Details

### Overview
This document specifies how user profile records, demographic data, and bank account attachments are stored and managed.

---

### Topic: Viewing User Profile
- **Endpoint:** `GET /api/v1/profile/`
- **Access Rule:** Requires authenticated user access.
- **Fields Returned:**
  - `user_id`: Unique identifier.
  - `full_name`: User's full name.
  - `email`: Registered email.
  - `date_of_birth`: Birthdate.
  - `gender`: "Male", "Female", or "Other".
  - `marital_status`: Single, Married, etc.
  - `father_name` / `mother_name`: Primary parent records.
  - `occupation`: Job status.
  - `annual_income`: Financial bracket.
  - `address` / `city` / `state` / `pincode`: Mailing location details.
  - `pan_number` / `aadhaar_number`: Verified tax/identity values.
  - `bank_name` / `bank_account_number` / `bank_ifsc`: Registered bank details for money transfers.

---

### Topic: Updating Profile Information
- **Endpoint:** `PATCH /api/v1/profile/`
- **Validation Schema (`updateProfileSchema`):**
  - Allows optional partial updates to demographic, bank, address, and ID fields.
  - Pincodes must be checked for 6 digits; bank IFSC must conform to IFSC format codes.
- **Limitation:** Once a KYC record becomes `APPROVED`, updates to sensitive fields (like PAN, Aadhaar, and Bank Account details) are frozen and can only be modified with administrative review to prevent account takeover and fraud.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: "User not found"**
   - **Reason:** The authenticated token belongs to a user record that has been deleted or is missing from the database.
   - **Solution:** Re-register or contact support.
2. **Error: "Verified identity fields cannot be modified after KYC approval"**
   - **Reason:** Once an admin approves your KYC, your tax IDs (PAN, Aadhaar) and bank details are locked for security to prevent identity theft or bank fraud.
   - **Solution:** If you must change your bank account, contact our support desk with valid documentation.
3. **Error: "IFSC code format invalid" or "Pincode format invalid"**
   - **Reason:** Your patch payload contains formatting that fails schema checks.
   - **Solution:** Ensure the IFSC is an 11-character code (e.g., `UTIB0000245`) and the pincode is exactly 6 digits.
