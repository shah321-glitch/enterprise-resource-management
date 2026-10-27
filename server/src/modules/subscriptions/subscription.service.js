import { Subscription } from './subscription.model.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

/**
 * Calculates next renewal date based on billing frequency.
 */
export const calculateNextRenewalDate = (currentDate, frequency, customIntervalDays = 30) => {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'CUSTOM':
      next.setDate(next.getDate() + (customIntervalDays || 30));
      break;
    case 'ONE_TIME':
    default:
      break;
  }
  return next;
};

export const listSubscriptions = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    provider,
    status,
    billingFrequency,
    upcomingDays,
  } = filters;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { provider: { $regex: search, $options: 'i' } },
      { plan: { $regex: search, $options: 'i' } },
    ];
  }

  if (provider) query.provider = provider;
  if (status) query.status = status;
  if (billingFrequency) query.billingFrequency = billingFrequency;

  if (upcomingDays) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + Number(upcomingDays));

    query.nextRenewalDate = { $gte: now, $lte: thresholdDate };
    query.status = { $in: ['ACTIVE', 'PENDING_RENEWAL'] };
  }

  const skip = (page - 1) * limit;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(query)
      .populate('resourceId', 'name provider category costInCents')
      .populate('responsibleEmployeeId', 'name email department')
      .sort({ nextRenewalDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(query),
  ]);

  return {
    subscriptions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getSubscriptionById = async (id) => {
  const subscription = await Subscription.findById(id)
    .populate('resourceId')
    .populate('responsibleEmployeeId', 'name email department')
    .populate('cancellationDetails.cancelledBy', 'name email')
    .populate('renewalHistory.processedBy', 'name email')
    .lean();

  if (!subscription) {
    throw new NotFoundError('Subscription not found');
  }
  return subscription;
};

export const createSubscription = async (data, actorUser, req = null) => {
  const subscription = new Subscription({
    ...data,
    responsibleEmployeeId: data.responsibleEmployeeId || actorUser?._id,
  });

  await subscription.save();

  await createAuditLog({
    actor: actorUser,
    action: 'SUBSCRIPTION_CREATED',
    targetType: 'Subscription',
    targetId: subscription._id,
    targetName: subscription.name,
    details: { provider: subscription.provider, costInCents: subscription.costInCents, frequency: subscription.billingFrequency },
    req,
  });

  return subscription;
};

export const updateSubscription = async (id, data, actorUser, req = null) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) {
    throw new NotFoundError('Subscription not found');
  }

  const previous = {
    plan: subscription.plan,
    costInCents: subscription.costInCents,
    nextRenewalDate: subscription.nextRenewalDate,
    status: subscription.status,
  };

  Object.assign(subscription, data);
  await subscription.save();

  await createAuditLog({
    actor: actorUser,
    action: 'SUBSCRIPTION_UPDATED',
    targetType: 'Subscription',
    targetId: subscription._id,
    targetName: subscription.name,
    details: { previous, updated: data },
    req,
  });

  return subscription;
};

export const renewSubscription = async (id, renewalData = {}, actorUser, req = null) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) {
    throw new NotFoundError('Subscription not found');
  }

  if (subscription.status === 'CANCELLED') {
    throw new BadRequestError('Cannot renew a cancelled subscription');
  }

  const previousRenewalDate = new Date(subscription.nextRenewalDate);
  const now = new Date();

  // Prevent duplicate renewal if renewed very recently (e.g. within 1 hour for the same cycle)
  const lastRenewal = subscription.renewalHistory[subscription.renewalHistory.length - 1];
  if (lastRenewal && (now.getTime() - new Date(lastRenewal.renewedAt).getTime()) < 3600000) {
    throw new BadRequestError('Duplicate renewal rejected: subscription was already renewed recently');
  }

  const cost = renewalData.amountInCents !== undefined ? renewalData.amountInCents : subscription.costInCents;
  const newNextDate = renewalData.nextRenewalDate
    ? new Date(renewalData.nextRenewalDate)
    : calculateNextRenewalDate(previousRenewalDate, subscription.billingFrequency, subscription.customIntervalDays);

  // Record in renewal history
  subscription.renewalHistory.push({
    renewedAt: now,
    previousRenewalDate,
    nextRenewalDate: newNextDate,
    amountInCents: cost,
    currency: subscription.currency,
    processedBy: actorUser?._id,
  });

  // Record in billing history
  subscription.billingHistory.push({
    billingDate: now,
    amountInCents: cost,
    currency: subscription.currency,
    invoiceRef: renewalData.invoiceRef || `INV-${Date.now()}`,
    status: 'PAID',
  });

  subscription.nextRenewalDate = newNextDate;
  subscription.status = 'ACTIVE';
  // Clear reminders sent for the new cycle
  subscription.renewalRemindersSent = [];

  await subscription.save();

  await createAuditLog({
    actor: actorUser,
    action: 'SUBSCRIPTION_RENEWED',
    targetType: 'Subscription',
    targetId: subscription._id,
    targetName: subscription.name,
    details: {
      amountInCents: cost,
      previousRenewalDate,
      nextRenewalDate: newNextDate,
    },
    req,
  });

  return subscription;
};

export const cancelSubscription = async (id, reason, actorUser, req = null) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) {
    throw new NotFoundError('Subscription not found');
  }

  if (subscription.status === 'CANCELLED') {
    throw new BadRequestError('Subscription is already cancelled');
  }

  subscription.status = 'CANCELLED';
  subscription.autoRenew = false;
  subscription.cancellationDetails = {
    cancelledAt: new Date(),
    cancelledBy: actorUser?._id,
    reason,
  };

  await subscription.save();

  await createAuditLog({
    actor: actorUser,
    action: 'SUBSCRIPTION_CANCELLED',
    targetType: 'Subscription',
    targetId: subscription._id,
    targetName: subscription.name,
    details: { reason },
    req,
  });

  return subscription;
};

export const getUpcomingRenewals = async (days = 30) => {
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() + days);

  return Subscription.find({
    status: { $in: ['ACTIVE', 'PENDING_RENEWAL'] },
    nextRenewalDate: { $gte: now, $lte: threshold },
  })
    .populate('resourceId', 'name provider category costInCents')
    .populate('responsibleEmployeeId', 'name email department')
    .sort({ nextRenewalDate: 1 })
    .lean();
};

