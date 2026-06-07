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
  });

module.exports = {
  submitKycSchema,
};