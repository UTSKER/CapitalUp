const {
  registerUser,
  sendOTP,
  verifyOTP,
  loginUser,
  refreshAccessToken,
  logoutUser,
} = require("../services/auth.service");


// Register user controller
async function register(req, res) {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message:
        "Registration successful. OTP sent to your email",
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function sendOtp(req, res) {
  try {
    const result = await sendOTP(req.body);

    res.status(200).json({
      success: true,
      message: result.alreadyVerified
        ? "Email is already verified"
        : "OTP sent to your email",
      data: result,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      ...(error.retryAfter
        ? { retryAfter: error.retryAfter }
        : {}),
    });
  }
}

async function verifyOtp(req, res) {
  try {
    const result = await verifyOTP(req.body);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: result,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      ...(error.data ? { data: error.data } : {}),
      ...(error.retryAfter
        ? { retryAfter: error.retryAfter }
        : {}),
    });
  }
}

// Login user with email or mobile number
async function login(req, res) {
  try {
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
  sendOtp,
  verifyOtp,
  login,
  refresh,
  logout,
};
