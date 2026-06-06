const { z } = require("zod");

const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .optional(),
  mobile_number: z
    .string()
    .regex(/^[0-9]{10}$/, "Mobile number must contain exactly 10 digits")
    .optional(),
  date_of_birth: z.string().optional(),
  gender: z
    .enum(["Male", "Female", "Other"])
    .optional(),
  occupation: z.string().optional(),
  annual_income: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});

module.exports = {
  updateProfileSchema,
};