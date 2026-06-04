const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const redisClient = require("../../../config/redis");

const {
  findUserByEmail,
  findUserByMobile,
  createUser,
  findUserByIdentifier,
} = require("../repositories/auth.repository");

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
  loginUser,
  refreshAccessToken,
  logoutUser,
};