# Section: System Settings and Security
## Topic: Account Settings, Password Updates, and Notification Rules

### Overview
This document outlines user-facing configurations, profile security settings, and notifications.

---

### Topic: Password Management
- **Endpoint:** `POST /api/v1/auth/change-password`
- **Validation Constraints:**
  - `old_password`: Current active password (checked via bcrypt).
  - `new_password`: Must be different from the old password and comply with strong password regex checks (min 8 characters, letters, numbers, symbols).
- **Security Rule:** Password updates instantly invalidate existing JWT refresh tokens, requiring the user to re-authenticate on all other devices.

---

### Topic: Security Verification Settings
- **Features:**
  - **Email Alerts:** Automatically triggered on login from a new IP address, bank transaction submission, or KYC status change.
  - **Mobile 2FA Verification:** Managed via `POST /api/v1/auth/send-mobile-otp` to verify actions with a secure code before changes are committed.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: "Incorrect current password"**
   - **Reason:** The value entered in `old_password` does not match the encrypted hash stored in the database.
   - **Solution:** Try entering the password again, or request a password reset from the login screen.
2. **Error: "New password does not meet complexity requirements"**
   - **Reason:** The `new_password` does not comply with the strength policy (requires 8+ characters, with uppercase, lowercase, numbers, and special characters).
   - **Solution:** Use a strong password containing diverse characters.
3. **Error: "Mobile verification code expired"**
   - **Reason:** Mobile OTP verification requests must be completed within 5 minutes of issuance.
   - **Solution:** Request a fresh mobile OTP from your settings panel.
