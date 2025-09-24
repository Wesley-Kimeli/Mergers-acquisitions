import { z } from 'zod';

// Schema to validate user ID parameter
export const userIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(Number),
});

// Schema to validate user update requests
export const updateUserSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(255, 'Name must not exceed 255 characters')
      .trim()
      .optional(),
    email: z
      .string()
      .email('Must be a valid email address')
      .max(255, 'Email must not exceed 255 characters')
      .toLowerCase()
      .trim()
      .optional(),
    role: z
      .enum(['user', 'admin'], {
        errorMap: () => ({ message: 'Role must be either "user" or "admin"' }),
      })
      .optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
    path: ['body'],
  });
