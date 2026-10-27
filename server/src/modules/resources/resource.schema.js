import { z } from 'zod';
import { RESOURCE_CATEGORIES, RESOURCE_STATUSES } from './resource.model.js';

export const createResourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  provider: z.string().min(1, 'Provider is required').max(100),
  category: z.enum(RESOURCE_CATEGORIES),
  resourceType: z.string().optional().default('General Resource'),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  department: z.string().optional().default('Engineering'),
  costInCents: z.coerce.number().int().min(0, 'Cost in cents must be non-negative'),
  currency: z.string().min(3).max(3).toUpperCase().default('USD'),
  status: z.enum(RESOURCE_STATUSES).optional().default('ACTIVE'),
  renewalInfo: z.object({
    renewalType: z.enum(['AUTO', 'MANUAL', 'NONE']).optional().default('NONE'),
    interval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM', 'NONE']).optional().default('NONE'),
    nextRenewalDate: z.string().datetime().optional().nullable(),
  }).optional(),
  notes: z.string().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const resourceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  provider: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
