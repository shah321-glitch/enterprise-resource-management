import { z } from 'zod';
import { BILLING_FREQUENCIES, SUBSCRIPTION_STATUSES } from './subscription.model.js';

export const createSubscriptionSchema = z.object({
  name: z.string().min(2).max(150),
  provider: z.string().min(1).max(100),
  resourceId: z.string().optional(),
  plan: z.string().optional().default('Standard'),
  startDate: z.string().datetime(),
  billingFrequency: z.enum(BILLING_FREQUENCIES).default('MONTHLY'),
  customIntervalDays: z.coerce.number().int().positive().optional(),
  nextRenewalDate: z.string().datetime(),
  costInCents: z.coerce.number().int().min(0),
  currency: z.string().min(3).max(3).toUpperCase().default('USD'),
  autoRenew: z.boolean().optional().default(true),
  status: z.enum(SUBSCRIPTION_STATUSES).optional().default('ACTIVE'),
  responsibleEmployeeId: z.string().optional(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();

export const renewSubscriptionSchema = z.object({
  amountInCents: z.coerce.number().int().min(0).optional(),
  nextRenewalDate: z.string().datetime().optional(),
  invoiceRef: z.string().optional(),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().min(2, 'Cancellation reason is required').max(500),
});

export const subscriptionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  provider: z.string().optional(),
  status: z.string().optional(),
  billingFrequency: z.string().optional(),
  upcomingDays: z.coerce.number().int().positive().optional(),
});

