import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Server,
  CreditCard,
  AlertTriangle,
  Receipt,
  TrendingUp,
  Cpu,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../../lib/api.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

const STATUS_COLORS = {
  ACTIVE: '#10b981',
  TRIAL: '#3b82f6',
  PENDING_RENEWAL: '#f59e0b',
  EXPIRED: '#ef4444',
  CANCELLED: '#6b7280',
};

export const DashboardPage = () => {
  const [dateFilter, setDateFilter] = useState('all');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-stats', dateFilter],
    queryFn: async () => {
      let params = {};
      const now = new Date();
      if (dateFilter === 'this-month') {
        params.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (dateFilter === 'last-3-months') {
        params.startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
      }
      const res = await api.get('/reports/dashboard-stats', { params });
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" title="Failed to load dashboard data">
        {error.message || 'Unable to retrieve live database metrics. Ensure server is online.'}
      </Alert>
    );
  }

  const { kpis, charts, tables } = data || {
    kpis: {},
    charts: { monthlyExpenses: [], subscriptionDistribution: [], projectAllocations: [] },
    tables: { upcomingRenewalsTable: [], recentExpensesTable: [], apiBalanceSummary: [] },
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Operational Overview</h1>
          <p className="text-sm text-muted-foreground">
            Live database telemetry across resources, subscriptions, and financial liabilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('last-3-months')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'last-3-months' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Last 90 Days
            </button>
            <button
              onClick={() => setDateFilter('this-month')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'this-month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Current Month
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} isLoading={isFetching}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Digital Resources */}
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Resources</span>
              <Server className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground">{kpis.totalResources}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active digital assets</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Subs</span>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground">{kpis.activeSubscriptions}</span>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Excludes cancelled</p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Renewals (<= 30 Days) */}
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Renewals Due</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground">{kpis.upcomingRenewals}</span>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Due in &le; 30 days</p>
            </div>
          </CardContent>
        </Card>

        {/* Expired Subscriptions */}
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Expired Subs</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground">{kpis.expiredSubscriptions}</span>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">Require review</p>
            </div>
          </CardContent>
        </Card>

        {/* Low API Quotas Alert */}
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Low Quotas</span>
              <Cpu className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground">{kpis.lowCreditsCount}</span>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">Below threshold</p>
            </div>
          </CardContent>
        </Card>

        {/* Actual Paid Expenses */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Paid Expenses</span>
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-foreground">{formatCurrency(kpis.totalExpensesInCents)}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Actual verified payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Expense Trend Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Historical Paid Expenses</CardTitle>
            <CardDescription>Actual verified payments over recent 6 months (excluding forecasts)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              {charts.monthlyExpenses.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No expense records found for selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyExpenses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888888" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#888888" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Paid Expense']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#expenseGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status Distribution Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Health</CardTitle>
            <CardDescription>Distribution across lifecycle states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full flex items-center justify-center">
              {charts.subscriptionDistribution.length === 0 ? (
                <div className="text-xs text-muted-foreground">No subscriptions registered</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.subscriptionDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {charts.subscriptionDistribution.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} subscriptions`, name]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              {charts.subscriptionDistribution.map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }}
                  />
                  <span className="text-muted-foreground truncate">{item.status.replace('_', ' ')}:</span>
                  <span className="font-semibold text-foreground ml-auto">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Allocation Breakdown Bar Chart & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Cost Allocations */}
        <Card>
          <CardHeader>
            <CardTitle>Project-wise Resource Allocation</CardTitle>
            <CardDescription>Allocated monthly cost per active project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {charts.projectAllocations.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No active project allocations recorded
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.projectAllocations} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} stroke="#888888" />
                    <YAxis dataKey="code" type="category" tick={{ fontSize: 11 }} stroke="#888888" />
                    <Tooltip
                      formatter={(val) => [`$${val.toLocaleString()}`, 'Allocated Monthly']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="allocatedCost" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Usage & Balances Summary */}
        <Card>
          <CardHeader>
            <CardTitle>API Account Balances & Thresholds</CardTitle>
            <CardDescription>Multi-unit quotas and synchronization state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tables.apiBalanceSummary.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No API accounts configured</p>
              ) : (
                tables.apiBalanceSummary.map((acc) => {
                  const isLow = acc.reportedBalance <= acc.thresholdLimit;
                  return (
                    <div key={acc._id} className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {acc.provider}
                          <span className="text-[10px] text-muted-foreground">({acc.accountIdentifier})</span>
                        </span>
                        <Badge variant={isLow ? 'destructive' : 'success'}>
                          {isLow ? 'Low Quota' : 'Normal'}
                        </Badge>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold text-foreground">
                          {acc.unit === 'USD_CENTS'
                            ? formatCurrency(acc.reportedBalance)
                            : acc.reportedBalance.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-muted-foreground">{acc.unit}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Threshold: {acc.unit === 'USD_CENTS' ? formatCurrency(acc.thresholdLimit) : acc.thresholdLimit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Renewals Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming Renewals</CardTitle>
            <CardDescription>Subscriptions requiring attention in the next 30 days</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Subscription</th>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">Renewal Date</th>
                  <th className="py-2.5 px-4">Cost</th>
                  <th className="py-2.5 px-4">Auto Renew</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tables.upcomingRenewalsTable.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                      No renewals due within the next 30 days
                    </td>
                  </tr>
                ) : (
                  tables.upcomingRenewalsTable.map((sub) => (
                    <tr key={sub._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{sub.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{sub.provider}</td>
                      <td className="py-3 px-4 text-foreground">{formatDate(sub.nextRenewalDate)}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{formatCurrency(sub.costInCents, sub.currency)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={sub.autoRenew ? 'success' : 'secondary'}>
                          {sub.autoRenew ? 'Auto' : 'Manual'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={sub.status === 'ACTIVE' ? 'success' : 'warning'}>
                          {sub.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

