const express = require("express");

const router = express.Router();

const {
  register, login, refresh, logout, sendOtp, verifyOtp,
  sendMobileOtp, verifyMobileOtp, changePassword, resetPassword
} = require("../controllers/auth.controller");

const authenticate = require("../../../middlewares/auth.middleware");


const validate = require("../../../middlewares/validate.middleware");

const {
  registerSchema,
  loginSchema,
  sendOTPSchema,
  resendOTPSchema,
  verifyOTPSchema,
  sendMobileOTPSchema,
  verifyMobileOTPSchema,
  changePasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validator");

router.post(
  "/register",
  validate(registerSchema),
  validate.rateLimitOTP("send"),
  register
);

router.post(
  "/login",
  validate(loginSchema),
  login
);

router.post(
  "/send-otp",
  validate(sendOTPSchema),
  validate.rateLimitOTP("send"),
  sendOtp
);

router.post(
  "/resend-otp",
  validate(resendOTPSchema),
  validate.rateLimitOTP("resend"),
  sendOtp
);

router.post(
  "/verify-otp",
  validate(verifyOTPSchema),
  validate.rateLimitOTP("verify"),
  verifyOtp
);

router.post(
  "/refresh",
  refresh
);

router.post(
  "/logout",
  authenticate,
  logout
);

router.post(
  "/send-mobile-otp",
  validate(sendMobileOTPSchema),
  validate.rateLimitOTP("send"),
  sendMobileOtp
);

router.post(
  "/verify-mobile-otp",
  validate(verifyMobileOTPSchema),
  validate.rateLimitOTP("verify"),
  verifyMobileOtp
);

router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  validate.rateLimitOTP("verify"),
  resetPassword
);

module.exports = router;
