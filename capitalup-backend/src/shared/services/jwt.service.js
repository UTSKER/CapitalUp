const jwt = require("jsonwebtoken");

const accessSecret = process.env.JWT_SECRET || "capitalup-development-secret";
const refreshSecret =
  process.env.JWT_REFRESH_SECRET || `${accessSecret}-refresh`;

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    accessSecret,
    { expiresIn: Number(process.env.JWT_EXPIRY || 3600) }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: "refresh" },
    refreshSecret,
    { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRY || 604800) }
  );
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
