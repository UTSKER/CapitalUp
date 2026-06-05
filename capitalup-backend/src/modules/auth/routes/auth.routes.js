const express = require("express");

const router = express.Router();

const {
  register,login,refresh,logout,sendOtp,verifyOtp
} = require("../controllers/auth.controller");

const authenticate = require("../../../middlewares/auth.middleware");


const validate = require("../../../middlewares/validate.middleware");

const {
  registerSchema,
  loginSchema,
  sendOTPSchema,
  resendOTPSchema,
  verifyOTPSchema,
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

module.exports = router;
