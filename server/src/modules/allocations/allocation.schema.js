import { z } from 'zod';
import { ALLOCATION_METHODS, ALLOCATION_STATUSES } from './allocation.model.js';

export const createAllocationSchema = z.object({
  resourceId: z.string().min(1, 'Resource ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  assignedEmployeeId: z.string().optional().nullable(),
  allocationMethod: z.enum(ALLOCATION_METHODS).default('PERCENTAGE'),
  allocationValue: z.coerce.number().min(0, 'Allocation value must be >= 0'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  usageLimit: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

export const updateAllocationSchema = z.object({
  assignedEmployeeId: z.string().optional().nullable(),
  allocationMethod: z.enum(ALLOCATION_METHODS).optional(),
  allocationValue: z.coerce.number().min(0).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(ALLOCATION_STATUSES).optional(),
  usageLimit: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const reassignAllocationSchema = z.object({
  newProjectId: z.string().min(1, 'New project is required'),
  newAssignedEmployeeId: z.string().optional().nullable(),
  allocationMethod: z.enum(ALLOCATION_METHODS).optional(),
  allocationValue: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

