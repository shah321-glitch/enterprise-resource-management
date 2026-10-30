import { z } from 'zod';
import { PROJECT_STATUSES } from './project.model.js';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().min(2).max(30).toUpperCase(),
  description: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional().default('ACTIVE'),
  startDate: z.string().optional().nullable(),
  targetEndDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  leadId: z.string().optional(),
  projectManagerId: z.string().optional(),
  teamMemberIds: z.array(z.string()).optional().default([]),
  department: z.string().optional().default('Engineering'),
  budgetInCents: z.coerce.number().int().min(0).optional().default(0),
  currency: z.string().min(3).max(3).toUpperCase().default('USD'),
});

export const updateProjectSchema = createProjectSchema.partial();

