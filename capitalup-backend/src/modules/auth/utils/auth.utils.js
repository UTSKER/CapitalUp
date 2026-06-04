const crypto = require("crypto");

function generateOTP(length = 6) {
  const minimum = 10 ** (length - 1);
  return String(crypto.randomInt(minimum, minimum * 10));
}

function hashOTP(otp) {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || "capitalup-otp";
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

function otpMatches(otp, storedHash) {
  const candidate = Buffer.from(hashOTP(otp));
  const stored = Buffer.from(storedHash || "");
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

module.exports = {
  generateOTP,
  hashOTP,
  otpMatches,
};
