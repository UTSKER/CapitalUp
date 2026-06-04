const express = require("express");

const router = express.Router();

const {
  register,
  sendOTP,
  resendOTP,
  verifyOTP,
} = require("../controllers/auth.controller");

const validate = require("../../../middlewares/validate.middleware");
const { rateLimitOTP } = require("../../../middlewares/validate.middleware");

const {
  registerSchema,
  sendOTPSchema,
  verifyOTPSchema,
  resendOTPSchema,
} = require("../validators/auth.validator");

router.post(
  "/register",
  validate(registerSchema),
  register
);

router.post(
  "/send-otp",
  validate(sendOTPSchema),
  rateLimitOTP("send"),
  sendOTP
);

router.post(
  "/resend-otp",
  validate(resendOTPSchema),
  rateLimitOTP("resend"),
  resendOTP
);

router.post(
  "/verify-otp",
  validate(verifyOTPSchema),
  rateLimitOTP("verify"),
  verifyOTP
);

module.exports = router;
