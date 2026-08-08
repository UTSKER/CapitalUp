const { registerSchema } = require('./auth.validator');

describe('Auth Validator', () => {
  describe('registerSchema', () => {
    it('should validate a correct registration payload', () => {
      const validPayload = {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'Password123!',
      };

      const result = registerSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe('john.doe@example.com');
    });

    it('should reject a short full name', () => {
      const invalidPayload = {
        full_name: 'J',
        email: 'john.doe@example.com',
        password: 'Password123!',
      };

      const result = registerSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('at least 2 characters');
    });

    it('should reject a weak password missing a special character', () => {
      const invalidPayload = {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'Password1234',
      };

      const result = registerSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('at least one special character');
    });
  });
});
