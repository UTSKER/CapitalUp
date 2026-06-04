const express = require("express");

const router = express.Router();

const {
  register,
  sendOTP,
  resendOTP,
  verifyOTP,
  register,login,refresh,logout
} = require("../controllers/auth.controller");

const authenticate = require("../../../middlewares/auth.middleware");


const validate = require("../../../middlewares/validate.middleware");
const { rateLimitOTP } = require("../../../middlewares/validate.middleware");

const {
  registerSchema,
  sendOTPSchema,
  verifyOTPSchema,
  resendOTPSchema,
  loginSchema,
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
  "/login",
  validate(loginSchema),
  login
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
