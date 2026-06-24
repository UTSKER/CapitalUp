const { z } = require("zod");

const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .optional(),
  mother_name: z.string().trim().min(2).max(100).optional(),
  father_name: z.string().trim().min(2).max(100).optional(),
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
  marital_status: z.string().max(30).optional(),
  bank_name: z.string().trim().min(2).max(255).optional(),
  bank_account_number: z.string().min(9).max(50).optional(),
  bank_ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
  account_holder: z.string().trim().min(2).max(255).optional(),
  pan_full_name: z.string().trim().min(3).max(255).optional(),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  aadhaar_number: z.string().regex(/^\d{12}$/).optional(),
});

module.exports = {
  updateProfileSchema,
};
