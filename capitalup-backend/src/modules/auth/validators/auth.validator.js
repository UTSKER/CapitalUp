const { z } = require("zod");

const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .toLowerCase(),

  mobile_number: z
    .string()
    .regex(
      /^[0-9]{10}$/,
      "Mobile number must contain exactly 10 digits"
    ),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine(
      (val) => /[A-Z]/.test(val),
      {
        message:
          "Password must contain at least one uppercase letter",
      }
    )
    .refine(
      (val) => /\d/.test(val),
      {
        message:
          "Password must contain at least one digit",
      }
    )
    .refine(
      (val) =>
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(val),
      {
        message:
          "Password must contain at least one special character",
      }
    ),
});

const sendOTPSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
});

const verifyOTPSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must be 6 digits"),
});

const resendOTPSchema = sendOTPSchema;

module.exports = {
  registerSchema,
  sendOTPSchema,
  verifyOTPSchema,
  resendOTPSchema,
};
const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .refine(
      (value) => {
        const isEmail =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

        const isMobile =
          /^[0-9]{10}$/.test(value);

        return isEmail || isMobile;
      },
      {
        message:
          "Enter a valid email or 10-digit mobile number",
      }
    ),

  password: z
    .string()
    .min(
      1,
      "Password is required"
    ),
});

module.exports = {
  registerSchema, loginSchema
};
