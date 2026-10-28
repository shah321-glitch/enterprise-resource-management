import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  ExternalLink,
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
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton, StatCardSkeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

const STATUS_COLORS = {
  ACTIVE: '#10b981',
  TRIAL: '#3b82f6',
  PENDING_RENEWAL: '#f59e0b',
  EXPIRED: '#ef4444',
  CANCELLED: '#6b7280',
};

export const DashboardPage = () => {
  const [dateFilter, setDateFilter] = useState('all');
  const toast = useToast();

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

  const handleRefresh = async () => {
    await refetch();
    toast.info('Dashboard metrics updated from database');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <StatCardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
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
      <PageHeader
        title="Enterprise Operational Dashboard"
        description="Live telemetry across digital resources, SaaS subscriptions, API quota consumption, and project cost allocations."
        breadcrumbs={[{ label: 'Dashboard' }]}
        badge={
          <Badge dot variant="success" className="font-mono text-xs">
            Live Database Metrics
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border bg-card p-0.5 text-xs">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  dateFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateFilter('last-3-months')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  dateFilter === 'last-3-months'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Last 90 Days
              </button>
              <button
                onClick={() => setDateFilter('this-month')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  dateFilter === 'this-month'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Current Month
              </button>
            </div>

            <Button variant="outline" size="icon" onClick={handleRefresh} isLoading={isFetching} title="Refresh Live Data">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Digital Resources */}
        <Link to="/resources">
          <Card className="hover:border-primary/50 transition-colors h-full cursor-pointer">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Resources</span>
                <Server className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {kpis.totalResources ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Across all providers
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Active Subscriptions */}
        <Link to="/subscriptions">
          <Card className="hover:border-primary/50 transition-colors h-full cursor-pointer">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Subs</span>
                <CreditCard className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {kpis.activeSubscriptions ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Recurring contracts
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Expired / Inactive */}
        <Link to="/subscriptions">
          <Card className="hover:border-primary/50 transition-colors h-full cursor-pointer">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Expired Subs</span>
                <Clock className="h-4 w-4 text-rose-500" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {kpis.expiredSubscriptions ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Lapsed or cancelled
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Upcoming Renewals */}
        <Link to="/subscriptions">
          <Card className="hover:border-primary/50 transition-colors h-full cursor-pointer">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Renewals Due</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {kpis.upcomingRenewalsCount ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Next 30 days
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Low API Credits */}
        <Link to="/api-credits">
          <Card className="hover:border-primary/50 transition-colors h-full cursor-pointer">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Low Quotas</span>
                <Cpu className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {kpis.lowApiCreditsCount ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Below threshold
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Actual Paid Expenses */}
        <Link to="/expenses">
          <Card className="hover:border-primary/50 transition-colors h-full cursor-pointer">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Paid Actuals</span>
                <Receipt className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="mt-3">
                <span className="text-xl font-bold font-mono text-foreground truncate block">
                  {formatCurrency(kpis.totalExpensesInCents || 0, 'USD')}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Official settlements
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Actuals Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Actual Paid Expenditure Trend</CardTitle>
              <CardDescription>Verified expense payments by calendar month</CardDescription>
            </div>
            <Link to="/expenses" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-4">
              {charts.monthlyExpenses.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No expense history"
                  description="No historical payments recorded for the selected window."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyExpenses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Total Paid']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalDollars"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#expenseGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subscription Status Mix</CardTitle>
            <CardDescription>Breakdown by current lifecycle status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full flex flex-col items-center justify-center">
              {charts.subscriptionDistribution.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No subscriptions"
                  description="No active contracts registered."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.subscriptionDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {charts.subscriptionDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.status] || '#6b7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Allocation & API Balance Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Resource Cost Allocation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Project Resource Cost Allocations</CardTitle>
              <CardDescription>Active resource costs attributed to projects</CardDescription>
            </div>
            <Link to="/allocations" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
              <span>Allocations</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {charts.projectAllocations.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No project allocations"
                  description="Assign digital resources to projects to view cost distribution."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.projectAllocations} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                    <XAxis type="number" fontSize={11} tickFormatter={(val) => `$${val}`} />
                    <YAxis dataKey="projectName" type="category" fontSize={11} width={100} />
                    <Tooltip
                      formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Allocated Monthly']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="allocatedCost" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Usage & Balances Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">API Quota Balances & Alerts</CardTitle>
              <CardDescription>Multi-unit quotas and synchronization status</CardDescription>
            </div>
            <Link to="/api-credits" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
              <span>View Quotas</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tables.apiBalanceSummary.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No API accounts configured</p>
              ) : (
                tables.apiBalanceSummary.map((acc) => {
                  const isLow = acc.reportedBalance <= acc.thresholdLimit;
                  return (
                    <div key={acc._id} className="p-3.5 rounded-xl border border-border bg-secondary/30 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {acc.provider}
                          <span className="text-[10px] text-muted-foreground font-mono">({acc.accountIdentifier})</span>
                        </span>
                        <Badge dot variant={isLow ? 'destructive' : 'success'}>
                          {isLow ? 'Low Quota' : 'Normal'}
                        </Badge>
                      </div>

                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-bold font-mono text-foreground">
                          {acc.creditModel === 'MONETARY'
                            ? formatCurrency(acc.reportedBalance)
                            : acc.reportedBalance.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-muted-foreground">{acc.unit}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Threshold: {acc.creditModel === 'MONETARY' ? formatCurrency(acc.thresholdLimit) : acc.thresholdLimit.toLocaleString()}
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
            <CardTitle className="text-base">Upcoming Subscription Renewals</CardTitle>
            <CardDescription>Recurring liabilities due in the next 30 days</CardDescription>
          </div>
          <Link to="/subscriptions" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
            <span>Manage All Subscriptions</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase bg-secondary/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Subscription</th>
                  <th className="py-2.5 px-4 font-semibold">Provider</th>
                  <th className="py-2.5 px-4 font-semibold">Renewal Date</th>
                  <th className="py-2.5 px-4 font-semibold">Cost</th>
                  <th className="py-2.5 px-4 font-semibold">Auto Renew</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tables.upcomingRenewalsTable.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No renewals due within the next 30 days
                    </td>
                  </tr>
                ) : (
                  tables.upcomingRenewalsTable.map((sub) => (
                    <tr key={sub._id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{sub.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{sub.provider}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{formatDate(sub.nextRenewalDate)}</td>
                      <td className="py-3 px-4 font-bold font-mono text-foreground">
                        {formatCurrency(sub.costInCents, sub.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={sub.autoRenew ? 'success' : 'secondary'}>
                          {sub.autoRenew ? 'Auto' : 'Manual'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge dot variant={sub.status === 'ACTIVE' ? 'success' : 'warning'}>
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
