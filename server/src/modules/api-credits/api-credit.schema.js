import { z } from 'zod';
import { CREDIT_MODELS } from './api-credit.model.js';

export const createApiCreditSchema = z.object({
  provider: z.string().min(1).max(100),
  accountIdentifier: z.string().min(1).max(150),
  resourceId: z.string().optional(),
  projectId: z.string().optional(),
  creditModel: z.enum(CREDIT_MODELS),
  unit: z.string().min(1).max(30).toUpperCase().default('USD_CENTS'),
  reportedBalance: z.coerce.number().min(0).default(0),
  totalPurchased: z.coerce.number().min(0).optional().default(0),
  thresholdLimit: z.coerce.number().min(0).default(1000),
  resetDate: z.string().datetime().optional().nullable(),
});

export const updateApiCreditSchema = createApiCreditSchema.partial();

export const recordUsageSchema = z.object({
  amount: z.coerce.number().positive('Usage amount must be greater than 0'),
  description: z.string().optional(),
});

