const {
  registerUser,
  sendOTP: sendOTPService,
  verifyOTP: verifyOTPService,
} = require("../services/auth.service");
const { registerUser } = require("../services/auth.service");
const { loginUser } = require("../services/auth.service");
const { refreshAccessToken } = require("../services/auth.service");
const { logoutUser } = require("../services/auth.service");


// Register user controller
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
// Login user with email or mobile number
async function login(req, res) {
  try {
    const user = await loginUser(req.body);

   const result = await loginUser(req.body);

res.status(200).json({
  success: true,
  ...result,
});
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    const result =
      await refreshAccessToken(
        refreshToken
      );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
}

async function logout(
  req,
  res
) {
  try {
    await logoutUser(
      req.user.userId
    );

    res.json({
      success: true,
      message:
        "Logged out successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  register,
  sendOTP,
  resendOTP,
  verifyOTP,
  login,
  refresh,
  logout,
};
