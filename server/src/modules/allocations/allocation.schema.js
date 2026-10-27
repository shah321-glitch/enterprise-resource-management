import { z } from 'zod';
import { ALLOCATION_METHODS, ALLOCATION_STATUSES } from './allocation.model.js';

export const createAllocationSchema = z.object({
  resourceId: z.string().min(1, 'Resource ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  assignedEmployeeId: z.string().optional(),
  allocationMethod: z.enum(ALLOCATION_METHODS).default('PERCENTAGE'),
  allocationValue: z.coerce.number().min(0, 'Allocation value must be >= 0'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  usageLimit: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export const updateAllocationSchema = z.object({
  assignedEmployeeId: z.string().optional(),
  allocationMethod: z.enum(ALLOCATION_METHODS).optional(),
  allocationValue: z.coerce.number().min(0).optional(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.enum(ALLOCATION_STATUSES).optional(),
  usageLimit: z.coerce.number().optional(),
  notes: z.string().optional(),
});
