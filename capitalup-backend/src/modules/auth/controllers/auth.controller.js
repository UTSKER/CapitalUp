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
  login,
  refresh,
  logout,
};
