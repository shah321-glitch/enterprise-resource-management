import cron from 'node-cron';
import { Subscription } from '../modules/subscriptions/subscription.model.js';
import { ApiCreditAccount } from '../modules/api-credits/api-credit.model.js';
import { createNotification } from '../modules/notifications/notification.service.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const runRenewalReminderJob = async () => {
  try {
    const now = new Date();
    const REMINDER_THRESHOLDS = [30, 15, 7, 1];

    for (const days of REMINDER_THRESHOLDS) {
      const windowStart = new Date();
      windowStart.setDate(now.getDate() + days - 1);
      const windowEnd = new Date();
      windowEnd.setDate(now.getDate() + days);

      const dueSubscriptions = await Subscription.find({
        status: { $in: ['ACTIVE', 'PENDING_RENEWAL'] },
        nextRenewalDate: { $gte: windowStart, $lte: windowEnd },
        'renewalRemindersSent.daysBefore': { $ne: days },
      });

      for (const sub of dueSubscriptions) {
        const severity = days <= 3 ? 'CRITICAL' : days <= 7 ? 'WARNING' : 'INFO';
        await createNotification({
          recipientId: sub.responsibleEmployeeId,
          type: 'RENEWAL_UPCOMING',
          title: `Upcoming Renewal (${days} day${days > 1 ? 's' : ''}): ${sub.name}`,
          message: `Subscription '${sub.name}' from ${sub.provider} is due for renewal on ${new Date(sub.nextRenewalDate).toLocaleDateString()}. Amount: $${(sub.costInCents / 100).toFixed(2)} ${sub.currency}.`,
          severity,
          targetEntity: { entityType: 'Subscription', entityId: sub._id },
        });

        // Record reminder sent for idempotency
        sub.renewalRemindersSent.push({
          daysBefore: days,
          sentAt: new Date(),
        });
        await sub.save();
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error in runRenewalReminderJob');
  }
};

export const runExpiredSubscriptionCheckJob = async () => {
  try {
    const now = new Date();
    // Subscriptions whose nextRenewalDate is in the past and still marked ACTIVE
    const overdue = await Subscription.find({
      status: 'ACTIVE',
      nextRenewalDate: { $lt: now },
      autoRenew: false, // manual renewal that has passed
    });

    for (const sub of overdue) {
      sub.status = 'EXPIRED';
      await sub.save();

      await createNotification({
        recipientId: sub.responsibleEmployeeId,
        type: 'SUBSCRIPTION_EXPIRED',
        title: `Subscription Expired: ${sub.name}`,
        message: `Subscription '${sub.name}' from ${sub.provider} expired on ${new Date(sub.nextRenewalDate).toLocaleDateString()}.`,
        severity: 'CRITICAL',
        targetEntity: { entityType: 'Subscription', entityId: sub._id },
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error in runExpiredSubscriptionCheckJob');
  }
};

export const runLowCreditCheckJob = async () => {
  try {
    const lowAccounts = await ApiCreditAccount.find({
      $expr: { $lte: ['$reportedBalance', '$thresholdLimit'] },
    });

    for (const account of lowAccounts) {
      await createNotification({
        type: 'LOW_API_CREDIT',
        title: `Low API Credit Alert: ${account.provider}`,
        message: `Current balance for account '${account.accountIdentifier}' (${account.provider}) is ${account.reportedBalance} ${account.unit}, below threshold limit of ${account.thresholdLimit}.`,
        severity: 'WARNING',
        targetEntity: { entityType: 'ApiCreditAccount', entityId: account._id },
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error in runLowCreditCheckJob');
  }
};

export const initScheduler = () => {
  if (!env.CRON_ENABLED) {
    logger.info('Scheduler disabled via configuration');
    return;
  }

  // Run daily at midnight: '0 0 * * *'
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled maintenance jobs...');
    await runRenewalReminderJob();
    await runExpiredSubscriptionCheckJob();
    await runLowCreditCheckJob();
    logger.info('Completed scheduled maintenance jobs.');
  });

  logger.info('Background scheduler initialized successfully');
};

