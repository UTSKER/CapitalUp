const {
  registerUser,
  sendOTP: sendOTPService,
  verifyOTP: verifyOTPService,
} = require("../services/auth.service");

async function register(req, res) {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function sendOTP(req, res, next) {
  try {
    const data = await sendOTPService(req.body.email, req.otpRateLimitKey);
    res.json({
      success: true,
      message: "OTP sent to your email",
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function resendOTP(req, res, next) {
  return sendOTP(req, res, next);
}

async function verifyOTP(req, res, next) {
  try {
    const data = await verifyOTPService(
      req.body.email,
      req.body.otp,
      req.otpRateLimitKey
    );
    res.json({
      success: true,
      message: "Email verified successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  sendOTP,
  resendOTP,
  verifyOTP,
};
