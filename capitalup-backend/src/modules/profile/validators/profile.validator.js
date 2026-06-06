const { z } = require("zod");

const updateProfileSchema = z.object({
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