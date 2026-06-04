function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      console.warn("Validation failed:", req.method, req.originalUrl);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues,
      });
    }

    req.body = result.data;

    next();
  };
}

const {
  getToken,
  getTokenTTL,
} = require("../shared/services/redis.service");

const LIMITS = {
  send: { key: "send_otp", max: 3 },
  resend: { key: "resend_otp", max: 2 },
  verify: { key: "verify_otp", max: 5 },
};

function rateLimitOTP(operation) {
  return async (req, res, next) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      const lockKey = `rate_limit:otp_lock:${email}`;
      const lockTTL = await getTokenTTL(lockKey);

      if (lockTTL > 0) {
        return rateLimitResponse(res, lockTTL, "Email verification is temporarily locked");
      }

      const limit = LIMITS[operation];
      const key = `rate_limit:${limit.key}:${email}`;
      const count = Number((await getToken(key)) || 0);

      if (count >= limit.max) {
        const ttl = await getTokenTTL(key);
        console.warn("OTP rate limit exceeded:", operation, email);
        return rateLimitResponse(res, Math.max(ttl, 1));
      }

      req.otpRateLimitKey = key;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function rateLimitResponse(res, retryAfter, message = "Too many requests") {
  res.set("Retry-After", String(retryAfter));
  return res.status(429).json({
    success: false,
    message: `${message}. Please try again later`,
    retryAfter,
    timestamp: new Date().toISOString(),
  });
}

module.exports = validate;
module.exports.rateLimitOTP = rateLimitOTP;
