import { z } from 'zod';
import { ROLES } from '../../middleware/rbac.js';
import { passwordComplexitySchema } from '../auth/auth.schema.js';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: passwordComplexitySchema,
  role: z.nativeEnum(ROLES).default(ROLES.EMPLOYEE),
  department: z.string().min(1).default('General'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  department: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(ROLES).optional(),
});

export const setUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status boolean is required' }),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.nativeEnum(ROLES).optional(),
  department: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

