const { registerUser } = require("../services/auth.service");

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

module.exports = {
  register,
};