# Section: Authentication and Security
## Topic: User Registration, Login, and Session Management

### Overview
This document details the user registration, login, session, and password security features of the CapitalUp platform.

---

### Topic: Registration (Sign-Up)
- **Endpoint:** `POST /api/v1/auth/register`
- **Validation Rules:**
  - `full_name`: Required string (minimum 2 characters, maximum 100 characters).
  - `email`: Required valid email string (must be unique).
  - `password`: Required string (minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, one number, and one special character).
- **Process Flow:**
  1. The client sends user details to the registration endpoint.
  2. The backend validates parameters against the registration schema.
  3. If parameters are valid, the server generates a verification OTP and sends it to the user's registered email address.
  4. The user account is created with a `PENDING_VERIFICATION` status until the email OTP is verified.

---

### Topic: Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Validation Rules:**
  - `email`: Required valid email.
  - `password`: Required password string.
- **Process Flow:**
  1. The server checks if the user exists and if the account is verified.
  2. The server compares the hashed password against the database record using bcrypt.
  3. Upon successful matching, the server issues a JSON Web Token (JWT) access token (expires in 15 minutes) and a refresh token (expires in 7 days).
  4. The client stores the access token in local storage and includes it in the `Authorization: Bearer <token>` header for all authenticated requests.

---

### Topic: Email OTP Verification
- **Endpoints:**
  - Send OTP: `POST /api/v1/auth/send-otp`
  - Verify OTP: `POST /api/v1/auth/verify-otp`
- **Rate Limiting:** Sending and verifying OTPs is protected by strict rate limiters to prevent brute-force attacks.
- **Process Flow:**
  1. Users request an OTP for sign-up verification or password recovery.
  2. A 6-digit numeric OTP is randomly generated and emailed using the mail server configuration.
  3. When verified, the user's status is updated to `ACTIVE` (or verification succeeds).

---

### Topic: Mobile OTP Verification
- **Endpoints:**
  - Send Mobile OTP: `POST /api/v1/auth/send-mobile-otp`
  - Verify Mobile OTP: `POST /api/v1/auth/verify-mobile-otp`
- **Purpose:** Used for verifying user mobile numbers as part of two-factor verification or security setups.

---

### Topic: Password Management & Recovery
- **Endpoints:**
  - Change Password: `POST /api/v1/auth/change-password` (Requires authentication)
  - Reset Password: `POST /api/v1/auth/reset-password` (Using password-reset OTP token)
- **Process Flow:**
  1. `change-password` takes `old_password` and `new_password` and updates the hash in the database.
  2. `reset-password` requires the user to input the reset token/OTP sent to their email to securely overwrite the old password.

---

### Topic: Google Third-Party OAuth Login
- **Endpoint:** `POST /api/v1/auth/google`
- **Purpose:** Fast single-sign-on (SSO) login. The backend verifies the Google token payload and either logs in the existing user or registers a new account linked to their Google profile.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: "OTP rate limit exceeded" or similar block**
   - **Reason:** The user requested or attempted to verify OTPs too many times in a short interval (e.g., within 1 minute).
   - **Solution:** Wait 2–5 minutes before requesting a new OTP code.
2. **Error: "Email already registered"**
   - **Reason:** The email address entered during registration is already linked to an existing account.
   - **Solution:** Try logging in with the email, or reset the password if forgotten.
3. **Error: "Account is pending verification"**
   - **Reason:** The user verified email details but did not complete the initial email OTP verification flow.
   - **Solution:** Complete the verification by calling `/api/v1/auth/verify-otp` with the last received code.
4. **Error: "Invalid credentials"**
   - **Reason:** The entered password does not match the hashed record in the database for the user email.
   - **Solution:** Double check password characters or use the Reset Password workflow.
5. **Error: "Token expired" or "Unauthorized access"**
   - **Reason:** The JWT access token has expired (after 15 minutes) or is missing from the header.
   - **Solution:** Call the `/api/v1/auth/refresh` endpoint with the refresh token to obtain a fresh access token without re-logging.
