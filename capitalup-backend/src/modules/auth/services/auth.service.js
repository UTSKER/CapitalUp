const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const redisClient = require("../../../config/redis");
const {
  storeVerificationToken,
  storeRefreshToken,
  getToken,
  deleteToken,
  verificationKey,
} = require("../../../shared/services/redis.service");
const {
  sendVerificationEmail,
  sendVerificationSuccessEmail,
} = require("../../../shared/services/email.service");

const {
  findUserByEmail,
  findUserByMobile,
  createUser,
  findUserByIdentifier,
  markEmailVerified,
} = require("../repositories/auth.repository");

const OTP_EXPIRY_SECONDS =
  Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60;
const OTP_EXPIRY_MINUTES = Math.floor(
  OTP_EXPIRY_SECONDS / 60
);
const MAX_FAILED_OTP_ATTEMPTS = 3;

function createServiceError(
  message,
  statusCode,
  extras = {}
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extras);
  return error;
}

function generateOTP() {
  return String(crypto.randomInt(0, 1000000)).padStart(
    6,
    "0"
  );
}

function createAccessToken(user) {
  return jwt.sign(
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
}

function createRefreshToken(userId) {
  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

async function createAuthTokens(user) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user.id);

  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
  };
}

function sanitizeUser(user) {
  if (!user) {
    return user;
  }

  const sanitized = { ...user };
  delete sanitized.password_hash;
  return sanitized;
}

async function sendOTPForUser(user) {
  const otp = generateOTP();

  await storeVerificationToken(
    user.email,
    otp,
    OTP_EXPIRY_SECONDS
  );

  await sendVerificationEmail(
    user.email,
    user.full_name,
    otp,
    OTP_EXPIRY_MINUTES
  );

  return {
    email: user.email,
    expiresIn: OTP_EXPIRY_SECONDS,
  };
}

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

  const verification = await sendOTPForUser(user);

  return {
    user: sanitizeUser(user),
    verification,
  };
}

async function sendOTP({ email }) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw createServiceError("Email not found", 404);
  }

  if (user.is_email_verified) {
    return {
      email,
      alreadyVerified: true,
      expiresIn: 0,
    };
  }

  return sendOTPForUser(user);
}

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

  if (!user.is_email_verified) {
    throw new Error(
      "Please verify your email before logging in"
    );
  }

  const isPasswordValid =
    await bcrypt.compare(
      password,
      user.password_hash
    );

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await createAuthTokens(user);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

async function verifyOTP({ email, otp }) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw createServiceError("Email not found", 404);
  }

  const lockKey = `lock:otp:${email}`;
  const lockTtl = await redisClient.ttl(lockKey);

  if (lockTtl > 0) {
    throw createServiceError(
      "Too many failed attempts. Please try again later",
      429,
      { retryAfter: lockTtl }
    );
  }

  const key = verificationKey(email);
  const storedOTP = await getToken(key);

  if (!storedOTP) {
    throw createServiceError(
      "OTP expired, request a new one",
      401
    );
  }

  if (storedOTP !== otp) {
    const failedKey = `failed_otp:${email}`;
    const failedAttempts =
      await redisClient.incr(failedKey);

    if (failedAttempts === 1) {
      await redisClient.expire(failedKey, 60 * 60);
    }

    if (
      failedAttempts >= MAX_FAILED_OTP_ATTEMPTS
    ) {
      await redisClient.setEx(
        lockKey,
        30 * 60,
        "locked"
      );
      await redisClient.del(failedKey);

      throw createServiceError(
        "Too many failed attempts. Please try again after 30 minutes",
        429,
        { retryAfter: 30 * 60 }
      );
    }

    const attemptsRemaining =
      MAX_FAILED_OTP_ATTEMPTS - failedAttempts;
    throw createServiceError(
      `Invalid OTP. ${attemptsRemaining} attempts remaining`,
      401,
      { data: { attemptsRemaining } }
    );
  }

  await deleteToken(key);
  await redisClient.del(`failed_otp:${email}`);

  const verifiedUser = user.is_email_verified
    ? user
    : await markEmailVerified(email);

  const { accessToken, refreshToken } =
    await createAuthTokens(verifiedUser);

  await sendVerificationSuccessEmail(
    verifiedUser.email,
    verifiedUser.full_name
  );

  return {
    user: sanitizeUser(verifiedUser),
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
  loginUser,
  refreshAccessToken,
  logoutUser,
};
