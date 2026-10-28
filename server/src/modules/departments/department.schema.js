import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Department code must be at least 2 characters').max(20).toUpperCase(),
  description: z.string().max(500).optional(),
  managerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid manager User ID').optional(),
  budgetInCents: z.number().int().nonnegative('Budget must be a non-negative integer').default(0),
  currency: z.string().length(3).toUpperCase().default('USD'),
  isActive: z.boolean().default(true),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

