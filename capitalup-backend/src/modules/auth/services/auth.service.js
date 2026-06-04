const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const redisClient = require("../../../config/redis");

const {
  findUserByEmail,
  findUserByMobile,
  createUser,
  markEmailVerified,
  findUserByIdentifier,
} = require("../repositories/auth.repository");
const {
  verificationKey,
  storeVerificationToken,
  storeRefreshToken,
  getToken,
  deleteToken,
  incrementWithExpiry,
} = require("../../../shared/services/redis.service");
const {
  sendVerificationEmail,
  sendVerificationSuccessEmail,
} = require("../../../shared/services/email.service");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../../shared/services/jwt.service");
const { generateOTP, hashOTP, otpMatches } = require("../utils/auth.utils");

const OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60;

// Register user
async function registerUser({
  full_name,
  email,
  mobile_number,
  password,
}) {
  const existingEmail =
    await findUserByEmail(email);

  if (existingEmail) {
    throw new Error("Email already exists");
  }

  const existingMobile =
    await findUserByMobile(mobile_number);

  if (existingMobile) {
    throw new Error(
      "Mobile number already exists"
    );
  }

  const password_hash =
    await bcrypt.hash(password, 12);

  const user = await createUser({
    full_name,
    email,
    mobile_number,
    password_hash,
  });

  delete user.password_hash;

  return user;
}

async function sendOTP(email, rateLimitKey) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw httpError(404, "Email not found");
  }

  const otp = generateOTP(Number(process.env.OTP_LENGTH || 6));
  await storeVerificationToken(email, hashOTP(otp), OTP_EXPIRY_SECONDS);

  try {
    await sendVerificationEmail(
      email,
      user.full_name,
      otp,
      Math.ceil(OTP_EXPIRY_SECONDS / 60)
    );
  } catch (error) {
    await deleteToken(verificationKey(email));
    throw httpError(500, "Unable to send verification email");
  }

  await incrementWithExpiry(rateLimitKey, rateLimitKey.includes("resend") ? 600 : 3600);
  return { email, expiresIn: OTP_EXPIRY_SECONDS };
}

async function verifyOTP(email, otp, rateLimitKey) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw httpError(404, "Email not found");
  }

  const storedHash = await getToken(verificationKey(email));
  if (!storedHash) {
    throw httpError(401, "OTP expired, request a new one");
  }

  if (!otpMatches(otp, storedHash)) {
    const attempts = await incrementWithExpiry(rateLimitKey, 3600);
    const attemptsRemaining = Math.max(3 - attempts, 0);

    if (attempts >= 3) {
      await incrementWithExpiry(`rate_limit:otp_lock:${email}`, 30 * 60);
      await deleteToken(verificationKey(email));
      const error = httpError(429, "Too many failed attempts. Email locked for 30 minutes");
      error.retryAfter = 30 * 60;
      throw error;
    }

    const error = httpError(401, `Invalid OTP. ${attemptsRemaining} attempts remaining`);
    error.data = { attemptsRemaining };
    throw error;
  }

  await deleteToken(verificationKey(email));
  await deleteToken(rateLimitKey);

  const verifiedUser = user.is_email_verified
    ? sanitizeUser(user)
    : await markEmailVerified(email);
  const accessToken = generateAccessToken(verifiedUser);
  const refreshToken = generateRefreshToken(verifiedUser);
  await storeRefreshToken(
    verifiedUser.id,
    refreshToken,
    Number(process.env.REFRESH_TOKEN_EXPIRY || 604800)
  );

  sendVerificationSuccessEmail(email, verifiedUser.full_name).catch((error) => {
    console.error("Unable to send verification success email:", error.message);
  });

  return { accessToken, refreshToken, user: sanitizeUser(verifiedUser) };
}

function sanitizeUser(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
// Login user
async function loginUser({
  identifier,
  password,
}) {
  const user =
    await findUserByIdentifier(identifier);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isPasswordValid =
    await bcrypt.compare(
      password,
      user.password_hash
    );

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );

  await redisClient.set(
    `refresh:${user.id}`,
    refreshToken,
    {
      EX: 7 * 24 * 60 * 60,
    }
  );

  delete user.password_hash;

  return {
    user,
    accessToken,
    refreshToken,
  };
}

// Refresh access token
async function refreshAccessToken(
  refreshToken
) {
  if (!refreshToken) {
    throw new Error(
      "Refresh token is required"
    );
  }

  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET
  );

  const storedToken =
    await redisClient.get(
      `refresh:${decoded.userId}`
    );

  if (!storedToken) {
    throw new Error(
      "Refresh token not found"
    );
  }

  if (storedToken !== refreshToken) {
    throw new Error(
      "Invalid refresh token"
    );
  }

  const accessToken = jwt.sign(
    {
      userId: decoded.userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );

  return {
    accessToken,
  };
}

async function logoutUser(
  userId
) {
  await redisClient.del(
    `refresh:${userId}`
  );

  return true;
}

module.exports = {
  registerUser,
  sendOTP,
  verifyOTP,
};
  loginUser,
  refreshAccessToken,
  logoutUser,
};
