const { z } = require("zod");

const submitKycSchema =
  z.object({
    pan_full_name: z
      .string()
      .min(3)
      .max(255),

    pan_number: z
      .string()
      .regex(
        /^[A-Z]{5}[0-9]{4}[A-Z]$/
      ),

    aadhaar_number: z
      .string()
      .regex(/^\d{12}$/),

    bank_account_number: z
      .string()
      .min(9)
      .max(50),

    bank_ifsc: z
      .string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    bank_name: z.string().max(255).optional(),
    account_holder: z.string().max(255).optional(),
    date_of_birth: z.string().min(1),
    gender: z.enum(["Male", "Female", "Other"]),
    marital_status: z.string().min(1).max(30),
    father_name: z.string().trim().min(2).max(100),
    mother_name: z.string().trim().min(2).max(100),
    occupation: z.string().min(1).max(100),
    annual_income: z.string().min(1).max(50),
    address: z.string().trim().min(3),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    pincode: z.string().regex(/^\d{6}$/),
  });

module.exports = {
  submitKycSchema,
};
