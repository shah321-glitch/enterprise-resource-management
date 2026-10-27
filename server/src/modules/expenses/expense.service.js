import { Expense } from './expense.model.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { createAuditLog } from '../audit-logs/audit-log.service.js';

export const listExpenses = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    provider,
    category,
    projectId,
    paymentStatus,
    startDate,
    endDate,
    year,
    month,
  } = filters;

  const query = { isForecast: false };

  if (provider) query.provider = provider;
  if (category) query.category = category;
  if (projectId) query.projectId = projectId;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) query.paymentDate.$lte = new Date(endDate);
  } else if (year) {
    const y = Number(year);
    if (month) {
      const m = Number(month) - 1;
      query.paymentDate = {
        $gte: new Date(y, m, 1),
        $lt: new Date(y, m + 1, 1),
      };
    } else {
      query.paymentDate = {
        $gte: new Date(y, 0, 1),
        $lt: new Date(y + 1, 0, 1),
      };
    }
  }

  const skip = (page - 1) * limit;

  const [expenses, total] = await Promise.all([
    Expense.find(query)
      .populate('resourceId', 'name category')
      .populate('subscriptionId', 'name plan')
      .populate('projectId', 'name code')
      .populate('createdBy', 'name email')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Expense.countDocuments(query),
  ]);

  return {
    expenses,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getExpenseById = async (id) => {
  const expense = await Expense.findById(id)
    .populate('resourceId')
    .populate('subscriptionId')
    .populate('projectId')
    .populate('createdBy', 'name email')
    .lean();

  if (!expense) {
    throw new NotFoundError('Expense record not found');
  }
  return expense;
};

export const createExpense = async (data, actorUser, req = null) => {
  // Check for duplicate invoice
  if (data.invoiceNumber && data.invoiceNumber.trim()) {
    const existing = await Expense.findOne({
      provider: data.provider,
      invoiceNumber: data.invoiceNumber.trim(),
    });
    if (existing) {
      throw new ConflictError(`Expense with invoice number '${data.invoiceNumber}' for provider '${data.provider}' already exists`);
    }
  }

  const expense = new Expense({
    ...data,
    invoiceNumber: data.invoiceNumber ? data.invoiceNumber.trim() : undefined,
    createdBy: actorUser?._id,
    isForecast: false,
  });

  await expense.save();

  await createAuditLog({
    actor: actorUser,
    action: 'EXPENSE_RECORDED',
    targetType: 'Expense',
    targetId: expense._id,
    targetName: `${expense.provider} (${expense.amountInCents / 100} ${expense.currency})`,
    details: {
      amountInCents: expense.amountInCents,
      currency: expense.currency,
      invoiceNumber: expense.invoiceNumber,
      provider: expense.provider,
    },
    req,
  });

  return expense;
};

export const updateExpense = async (id, data, actorUser, req = null) => {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw new NotFoundError('Expense record not found');
  }

  if (data.invoiceNumber && data.invoiceNumber.trim() !== expense.invoiceNumber) {
    const existing = await Expense.findOne({
      provider: data.provider || expense.provider,
      invoiceNumber: data.invoiceNumber.trim(),
      _id: { $ne: id },
    });
    if (existing) {
      throw new ConflictError(`Duplicate invoice '${data.invoiceNumber}' detected`);
    }
  }

  Object.assign(expense, data);
  await expense.save();

  await createAuditLog({
    actor: actorUser,
    action: 'EXPENSE_UPDATED',
    targetType: 'Expense',
    targetId: expense._id,
    details: data,
    req,
  });

  return expense;
};

export const deleteExpense = async (id, actorUser, req = null) => {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw new NotFoundError('Expense record not found');
  }

  await Expense.findByIdAndDelete(id);

  await createAuditLog({
    actor: actorUser,
    action: 'EXPENSE_DELETED',
    targetType: 'Expense',
    targetId: id,
    details: {
      amountInCents: expense.amountInCents,
      provider: expense.provider,
      invoiceNumber: expense.invoiceNumber,
    },
    req,
  });

  return { message: 'Expense record deleted successfully' };
};

export const getExpenseSummaries = async ({ startDate, endDate }) => {
  const matchStage = { isForecast: false, paymentStatus: 'PAID' };
  if (startDate || endDate) {
    matchStage.paymentDate = {};
    if (startDate) matchStage.paymentDate.$gte = new Date(startDate);
    if (endDate) matchStage.paymentDate.$lte = new Date(endDate);
  }

  const [byCategory, byProvider] = await Promise.all([
    Expense.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', totalAmountInCents: { $sum: '$amountInCents' }, count: { $sum: 1 } } },
      { $sort: { totalAmountInCents: -1 } },
    ]),
    Expense.aggregate([
      { $match: matchStage },
      { $group: { _id: '$provider', totalAmountInCents: { $sum: '$amountInCents' }, count: { $sum: 1 } } },
      { $sort: { totalAmountInCents: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return { byCategory, byProvider };
};

/**
 * Projects recurring subscription liabilities for upcoming months without adding them as paid expenses.
 */
export const getRecurringForecasts = async (monthsAhead = 6) => {
  const activeSubscriptions = await Subscription.find({
    status: { $in: ['ACTIVE', 'TRIAL'] },
  }).lean();

  const forecasts = [];
  const now = new Date();

  for (let m = 0; m < monthsAhead; m++) {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const monthKey = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
    let projectedCents = 0;

    for (const sub of activeSubscriptions) {
      if (sub.billingFrequency === 'MONTHLY') {
        projectedCents += sub.costInCents;
      } else if (sub.billingFrequency === 'QUARTERLY' && m % 3 === 0) {
        projectedCents += sub.costInCents;
      } else if (sub.billingFrequency === 'YEARLY' && m === 0) {
        projectedCents += sub.costInCents;
      }
    }

    forecasts.push({
      month: monthKey,
      projectedAmountInCents: projectedCents,
      currency: 'USD',
    });
  }

  return forecasts;
};
