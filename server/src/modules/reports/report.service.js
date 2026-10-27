import { Resource } from '../resources/resource.model.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import { Project } from '../projects/project.model.js';
import { ResourceAllocation } from '../allocations/allocation.model.js';
import { ApiCreditAccount } from '../api-credits/api-credit.model.js';
import { Expense } from '../expenses/expense.model.js';
import { fromCents } from '../../utils/currency.js';

export const getDashboardStats = async ({ startDate, endDate } = {}) => {
  const now = new Date();
  const next30Days = new Date();
  next30Days.setDate(now.getDate() + 30);

  // Expense query range
  const expenseMatch = { isForecast: false, paymentStatus: 'PAID' };
  if (startDate || endDate) {
    expenseMatch.paymentDate = {};
    if (startDate) expenseMatch.paymentDate.$gte = new Date(startDate);
    if (endDate) expenseMatch.paymentDate.$lte = new Date(endDate);
  }

  const [
    totalResources,
    activeSubscriptions,
    expiredSubscriptions,
    upcomingRenewals,
    lowCreditsCount,
    expenseAgg,
    subscriptionDistribution,
    recentExpenses,
    recentActivitySubscriptions,
    activeProjects,
    apiAccounts,
  ] = await Promise.all([
    // Total unarchived digital resources
    Resource.countDocuments({ isArchived: false }),

    // Active subscriptions (strictly ACTIVE or TRIAL)
    Subscription.countDocuments({ status: { $in: ['ACTIVE', 'TRIAL'] } }),

    // Expired subscriptions
    Subscription.countDocuments({ status: 'EXPIRED' }),

    // Upcoming renewals within 30 days
    Subscription.countDocuments({
      status: { $in: ['ACTIVE', 'PENDING_RENEWAL'] },
      nextRenewalDate: { $gte: now, $lte: next30Days },
    }),

    // Low API credits (reportedBalance <= thresholdLimit)
    ApiCreditAccount.countDocuments({
      $expr: { $lte: ['$reportedBalance', '$thresholdLimit'] },
    }),

    // Total actual expenses for period
    Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, totalInCents: { $sum: '$amountInCents' }, count: { $sum: 1 } } },
    ]),

    // Subscription status distribution
    Subscription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalCostInCents: { $sum: '$costInCents' } } },
    ]),

    // Recent 5 expenses
    Expense.find({ isForecast: false })
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate('projectId', 'name code')
      .lean(),

    // Upcoming 5 renewals
    Subscription.find({
      status: { $in: ['ACTIVE', 'PENDING_RENEWAL'] },
      nextRenewalDate: { $gte: now },
    })
      .sort({ nextRenewalDate: 1 })
      .limit(5)
      .populate('resourceId', 'name provider')
      .populate('responsibleEmployeeId', 'name')
      .lean(),

    // Project allocation breakdown
    ResourceAllocation.aggregate([
      { $match: { status: 'ACTIVE' } },
      {
        $group: {
          _id: '$projectId',
          allocatedCostInCents: { $sum: '$calculatedCostInCents' },
          resourceCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
      {
        $project: {
          projectId: '$_id',
          projectName: '$project.name',
          projectCode: '$project.code',
          allocatedCostInCents: 1,
          resourceCount: 1,
        },
      },
      { $sort: { allocatedCostInCents: -1 } },
      { $limit: 6 },
    ]),

    // Top API credit balances
    ApiCreditAccount.find()
      .sort({ reportedBalance: 1 })
      .limit(5)
      .lean(),
  ]);

  // Aggregate monthly expense history for the past 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyExpenseAgg = await Expense.aggregate([
    {
      $match: {
        isForecast: false,
        paymentStatus: 'PAID',
        paymentDate: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$paymentDate' },
          month: { $month: '$paymentDate' },
        },
        totalInCents: { $sum: '$amountInCents' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyChartData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const found = monthlyExpenseAgg.find((item) => item._id.year === yr && item._id.month === mo);
    monthlyChartData.push({
      name: `${monthNames[mo - 1]} ${yr}`,
      amount: found ? fromCents(found.totalInCents) : 0,
      cents: found ? found.totalInCents : 0,
    });
  }

  return {
    kpis: {
      totalResources,
      activeSubscriptions,
      expiredSubscriptions,
      upcomingRenewals,
      lowCreditsCount,
      totalExpensesInCents: expenseAgg[0]?.totalInCents || 0,
      expensesCount: expenseAgg[0]?.count || 0,
    },
    charts: {
      monthlyExpenses: monthlyChartData,
      subscriptionDistribution: subscriptionDistribution.map((s) => ({
        status: s._id,
        count: s.count,
        totalCost: fromCents(s.totalCostInCents),
      })),
      projectAllocations: activeProjects.map((p) => ({
        name: p.projectName,
        code: p.projectCode,
        allocatedCost: fromCents(p.allocatedCostInCents),
        resourceCount: p.resourceCount,
      })),
    },
    tables: {
      upcomingRenewalsTable: recentActivitySubscriptions,
      recentExpensesTable: recentExpenses,
      apiBalanceSummary: apiAccounts,
    },
  };
};

/**
 * Generates CSV string from tabular dataset
 */
export const toCSV = (headers, rows) => {
  const escapeField = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map((h) => escapeField(h.label)).join(',');
  const lines = rows.map((row) =>
    headers.map((h) => escapeField(typeof h.key === 'function' ? h.key(row) : row[h.key])).join(',')
  );

  return [headerLine, ...lines].join('\r\n');
};

export const exportReportCSV = async (reportType, filters = {}) => {
  switch (reportType) {
    case 'resources': {
      const resources = await Resource.find({ isArchived: false })
        .populate('ownerId', 'name email')
        .sort({ name: 1 })
        .lean();
      const headers = [
        { label: 'Name', key: 'name' },
        { label: 'Provider', key: 'provider' },
        { label: 'Category', key: 'category' },
        { label: 'Resource Type', key: 'resourceType' },
        { label: 'Department', key: 'department' },
        { label: 'Cost', key: (r) => fromCents(r.costInCents) },
        { label: 'Currency', key: 'currency' },
        { label: 'Status', key: 'status' },
        { label: 'Owner', key: (r) => r.ownerId?.name || 'Unassigned' },
        { label: 'Created At', key: (r) => new Date(r.createdAt).toISOString() },
      ];
      return { csv: toCSV(headers, resources), filename: `resources-${Date.now()}.csv` };
    }

    case 'subscriptions': {
      const subscriptions = await Subscription.find()
        .populate('resourceId', 'name')
        .populate('responsibleEmployeeId', 'name email')
        .sort({ nextRenewalDate: 1 })
        .lean();
      const headers = [
        { label: 'Subscription Name', key: 'name' },
        { label: 'Provider', key: 'provider' },
        { label: 'Plan', key: 'plan' },
        { label: 'Billing Frequency', key: 'billingFrequency' },
        { label: 'Cost', key: (s) => fromCents(s.costInCents) },
        { label: 'Currency', key: 'currency' },
        { label: 'Auto Renew', key: 'autoRenew' },
        { label: 'Status', key: 'status' },
        { label: 'Next Renewal Date', key: (s) => s.nextRenewalDate ? new Date(s.nextRenewalDate).toISOString().split('T')[0] : '' },
        { label: 'Responsible Employee', key: (s) => s.responsibleEmployeeId?.name || 'Unassigned' },
      ];
      return { csv: toCSV(headers, subscriptions), filename: `subscriptions-${Date.now()}.csv` };
    }

    case 'expenses': {
      const expenses = await Expense.find({ isForecast: false })
        .populate('projectId', 'name code')
        .sort({ paymentDate: -1 })
        .lean();
      const headers = [
        { label: 'Provider', key: 'provider' },
        { label: 'Category', key: 'category' },
        { label: 'Amount', key: (e) => fromCents(e.amountInCents) },
        { label: 'Currency', key: 'currency' },
        { label: 'Payment Date', key: (e) => new Date(e.paymentDate).toISOString().split('T')[0] },
        { label: 'Invoice Number', key: 'invoiceNumber' },
        { label: 'Payment Status', key: 'paymentStatus' },
        { label: 'Project', key: (e) => e.projectId?.name || 'General' },
      ];
      return { csv: toCSV(headers, expenses), filename: `expenses-${Date.now()}.csv` };
    }

    case 'api-credits': {
      const accounts = await ApiCreditAccount.find().sort({ provider: 1 }).lean();
      const headers = [
        { label: 'Provider', key: 'provider' },
        { label: 'Account Identifier', key: 'accountIdentifier' },
        { label: 'Credit Model', key: 'creditModel' },
        { label: 'Unit', key: 'unit' },
        { label: 'Reported Balance', key: 'reportedBalance' },
        { label: 'Threshold Limit', key: 'thresholdLimit' },
        { label: 'Sync Status', key: 'syncStatus' },
        { label: 'Last Sync', key: (a) => a.lastSyncAt ? new Date(a.lastSyncAt).toISOString() : 'Never' },
      ];
      return { csv: toCSV(headers, accounts), filename: `api-credits-${Date.now()}.csv` };
    }

    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
};
