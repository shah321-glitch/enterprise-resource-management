import { ApiCreditAccount } from './api-credit.model.js';
import { getConnectorForProvider } from '../connectors/connector.registry.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';
import { createNotification } from '../notifications/notification.service.js';

export const listCreditAccounts = async (filters = {}) => {
  const { page = 1, limit = 20, provider, creditModel, lowBalanceOnly = false } = filters;
  const query = {};

  if (provider) query.provider = provider;
  if (creditModel) query.creditModel = creditModel;

  if (lowBalanceOnly === 'true' || lowBalanceOnly === true) {
    query.$expr = { $lte: ['$reportedBalance', '$thresholdLimit'] };
  }

  const skip = (page - 1) * limit;

  const [accounts, total] = await Promise.all([
    ApiCreditAccount.find(query)
      .populate('resourceId', 'name provider category')
      .populate('projectId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ApiCreditAccount.countDocuments(query),
  ]);

  return {
    accounts,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getCreditAccountById = async (id) => {
  const account = await ApiCreditAccount.findById(id)
    .populate('resourceId')
    .populate('projectId')
    .lean();

  if (!account) {
    throw new NotFoundError('API credit account not found');
  }
  return account;
};

export const createCreditAccount = async (data, actorUser, req = null) => {
  const account = new ApiCreditAccount({
    ...data,
    estimatedBalance: data.reportedBalance,
  });

  await account.save();

  await createAuditLog({
    actor: actorUser,
    action: 'API_CREDIT_ACCOUNT_CREATED',
    targetType: 'ApiCreditAccount',
    targetId: account._id,
    targetName: `${account.provider} (${account.accountIdentifier})`,
    details: { model: account.creditModel, unit: account.unit, balance: account.reportedBalance },
    req,
  });

  return account;
};

export const updateCreditAccount = async (id, data, actorUser, req = null) => {
  const account = await ApiCreditAccount.findById(id);
  if (!account) {
    throw new NotFoundError('API credit account not found');
  }

  Object.assign(account, data);
  await account.save();

  await createAuditLog({
    actor: actorUser,
    action: 'API_CREDIT_ACCOUNT_UPDATED',
    targetType: 'ApiCreditAccount',
    targetId: account._id,
    details: data,
    req,
  });

  return account;
};

export const recordUsage = async (id, { amount, description }, actorUser, req = null) => {
  const account = await ApiCreditAccount.findById(id);
  if (!account) {
    throw new NotFoundError('API credit account not found');
  }

  account.usageRecords.push({
    date: new Date(),
    amount,
    description: description || 'API consumption',
  });

  // Deduct from estimated balance, floor at 0
  account.estimatedBalance = Math.max(0, (account.estimatedBalance || account.reportedBalance) - amount);
  account.reportedBalance = Math.max(0, account.reportedBalance - amount);

  // Check low balance threshold
  if (account.reportedBalance <= account.thresholdLimit) {
    await createNotification({
      type: 'LOW_API_CREDIT',
      title: `Low API Quota Alert: ${account.provider}`,
      message: `Balance for ${account.provider} (${account.accountIdentifier}) has reached ${account.reportedBalance} ${account.unit} (Threshold: ${account.thresholdLimit})`,
      severity: 'WARNING',
      targetEntity: { entityType: 'ApiCreditAccount', entityId: account._id },
    });
  }

  await account.save();
  return account;
};

export const syncCreditAccount = async (id, actorUser, req = null) => {
  const account = await ApiCreditAccount.findById(id);
  if (!account) {
    throw new NotFoundError('API credit account not found');
  }

  account.syncStatus = 'SYNCING';
  await account.save();

  try {
    const connector = getConnectorForProvider(account.provider);
    const balanceInfo = await connector.getBalance();

    account.reportedBalance = balanceInfo.balance;
    account.estimatedBalance = balanceInfo.balance;
    account.lastSyncAt = new Date();
    account.syncStatus = 'SUCCESS';
    account.lastSyncError = null;

    if (account.reportedBalance <= account.thresholdLimit) {
      await createNotification({
        type: 'LOW_API_CREDIT',
        title: `Low API Quota Alert: ${account.provider}`,
        message: `Current balance for ${account.provider} is ${account.reportedBalance} ${account.unit}, below threshold limit of ${account.thresholdLimit}`,
        severity: 'WARNING',
        targetEntity: { entityType: 'ApiCreditAccount', entityId: account._id },
      });
    }

    await account.save();

    await createAuditLog({
      actor: actorUser,
      action: 'API_CREDIT_SYNC_SUCCESS',
      targetType: 'ApiCreditAccount',
      targetId: account._id,
      details: { reportedBalance: account.reportedBalance, unit: account.unit },
      req,
    });

    return account;
  } catch (error) {
    account.syncStatus = 'FAILED';
    account.lastSyncError = error.message;
    await account.save();

    await createAuditLog({
      actor: actorUser,
      action: 'API_CREDIT_SYNC_FAILED',
      targetType: 'ApiCreditAccount',
      targetId: account._id,
      outcome: 'FAILURE',
      details: { error: error.message },
      req,
    });

    await createNotification({
      type: 'SYNC_FAILED',
      title: `API Sync Failed: ${account.provider}`,
      message: `Failed to synchronize API balance for ${account.provider}: ${error.message}`,
      severity: 'CRITICAL',
      targetEntity: { entityType: 'ApiCreditAccount', entityId: account._id },
    });

    throw error;
  }
};
