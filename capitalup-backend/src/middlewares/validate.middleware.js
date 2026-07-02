function validate(schema) {
  console.log("validate initialized with schema:", schema ? (schema.constructor ? schema.constructor.name : typeof schema) : "undefined");
  return (req, res, next) => {
    if (!schema) {
      console.error("validate middleware executed, but schema is undefined! req.path:", req.path);
      return res.status(500).json({
        success: false,
        message: "Internal server error: validator schema is undefined"
      });
    }
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues,
      });
    }

    req.body = result.data;

    next();
  };
}

const {redisClient} = require("../config/redis");

const otpRateLimits = {
  send: {
    keyPrefix: "rate_limit:send_otp",
    max: 3,
    windowSeconds: 60 * 60,
  },
  verify: {
    keyPrefix: "rate_limit:verify_otp",
    max: 5,
    windowSeconds: 60 * 60,
  },
  resend: {
    keyPrefix: "rate_limit:resend_otp",
    max: 2,
    windowSeconds: 10 * 60,
  },
};

function getRateLimitEmail(req) {
  return (
    req.body.email ||
    (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      req.body.identifier || ""
    )
      ? req.body.identifier
      : "")
  ).toLowerCase();
}

function rateLimitOTP(action) {
  const config = otpRateLimits[action];

  if (!config) {
    throw new Error(`Unknown OTP rate limit action: ${action}`);
  }

  return async (req, res, next) => {
    try {
      const email = getRateLimitEmail(req);

      if (!email) {
        return next();
      }

      const lockKey = `lock:otp:${email}`;
      const lockTtl = await redisClient.ttl(lockKey);

      if (lockTtl > 0) {
        res.set("Retry-After", String(lockTtl));

        return res.status(429).json({
          success: false,
          message:
            "Too many failed attempts. Please try again later",
          retryAfter: lockTtl,
          timestamp: new Date().toISOString(),
        });
      }

      const key = `${config.keyPrefix}:${email}`;
      const count = await redisClient.incr(key);
      const ttl = await redisClient.ttl(key);

      if (count === 1 || ttl < 0) {
        await redisClient.expire(
          key,
          config.windowSeconds
        );
      }

      if (count > config.max) {
        const retryAfter = await redisClient.ttl(key);

        res.set("Retry-After", String(retryAfter));

        console.warn(
          `OTP rate limit exceeded for ${action}: ${email}`
        );

        return res.status(429).json({
          success: false,
          message:
            "Too many requests. Please try again later",
          retryAfter,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

validate.rateLimitOTP = rateLimitOTP;

module.exports = validate;
