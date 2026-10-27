import { z } from 'zod';
import { EXPENSE_CATEGORIES, PAYMENT_STATUSES } from './expense.model.js';

export const createExpenseSchema = z.object({
  amountInCents: z.coerce.number().int().min(0, 'Expense amount in cents must be >= 0'),
  currency: z.string().min(3).max(3).toUpperCase().default('USD'),
  paymentDate: z.string().datetime(),
  provider: z.string().min(1).max(100),
  resourceId: z.string().optional(),
  subscriptionId: z.string().optional(),
  projectId: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES).default('OTHER'),
  invoiceNumber: z.string().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).default('PAID'),
  paymentMethod: z.string().optional().default('Corporate Card'),
  notes: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  provider: z.string().optional(),
  category: z.string().optional(),
  projectId: z.string().optional(),
  paymentStatus: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
