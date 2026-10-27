import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Receipt,
  Search,
  Filter,
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

const expenseFormSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  category: z.enum([
    'INFRASTRUCTURE',
    'CLOUD_INFRASTRUCTURE',
    'SOFTWARE_LICENSE',
    'SAAS_TOOL',
    'API_CREDITS',
    'CONSULTING',
    'HARDWARE',
    'OTHER',
  ]),
  amountDollars: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  invoiceNumber: z.string().optional(),
  paymentMethod: z.string().default('Corporate Card'),
  notes: z.string().optional(),
});

export const ExpensesPage = () => {
  const { isProjectManager, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('actuals'); // 'actuals' | 'forecasts'
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expenseError, setExpenseError] = useState(null);

  // Fetch actual expenses
  const { data: expensesData, isLoading, error } = useQuery({
    queryKey: ['expenses', page, categoryFilter],
    queryFn: async () => {
      const res = await api.get('/expenses', {
        params: {
          page,
          limit: 10,
          category: categoryFilter || undefined,
        },
      });
      return res.data;
    },
    enabled: activeTab === 'actuals',
  });

  // Fetch recurring forecasts
  const { data: forecastsData, isLoading: isForecastLoading } = useQuery({
    queryKey: ['expense-forecasts'],
    queryFn: async () => {
      const res = await api.get('/expenses/forecasts?months=6');
      return res.data.data;
    },
    enabled: activeTab === 'forecasts',
  });

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const amountInCents = Math.round(Number(formData.amountDollars) * 100);
      await api.post('/expenses', {
        ...formData,
        amountInCents,
        paymentDate: new Date(formData.paymentDate).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsCreateOpen(false);
      reset();
    },
    onError: (err) => {
      setExpenseError(err.response?.data?.error?.message || err.message || 'Failed to record expense');
    },
  });

  // Delete expense mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      provider: 'AWS',
      category: 'CLOUD_INFRASTRUCTURE',
      amountDollars: 150,
      currency: 'USD',
      paymentDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      paymentMethod: 'Corporate Card',
      notes: '',
    },
  });

  const expenses = expensesData?.data || [];
  const meta = expensesData?.meta || { total: 0, totalPages: 1 };
  const forecasts = forecastsData || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Expense & Budget Governance</h1>
          <p className="text-sm text-muted-foreground">
            Strict separation of verified paid actuals from recurring cost liability forecasts
          </p>
        </div>

        {isProjectManager && (
          <Button
            onClick={() => {
              setExpenseError(null);
              setIsCreateOpen(true);
            }}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Record Paid Expense</span>
          </Button>
        )}
      </div>

      {/* Tabs Switcher: Actuals vs Forecasts */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('actuals')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'actuals'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            Verified Paid Actuals
          </button>
          <button
            onClick={() => setActiveTab('forecasts')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'forecasts'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            Recurring Cost Projections (Forecasts)
          </button>
        </div>

        {activeTab === 'actuals' && (
          <div className="w-56">
            <Select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Expense Categories' },
                { value: 'CLOUD_INFRASTRUCTURE', label: 'Cloud Infrastructure' },
                { value: 'SAAS_TOOL', label: 'SaaS Tool' },
                { value: 'SOFTWARE_LICENSE', label: 'Software License' },
                { value: 'API_CREDITS', label: 'API Credits' },
                { value: 'CONSULTING', label: 'Consulting' },
                { value: 'HARDWARE', label: 'Hardware' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>
        )}
      </div>

      {/* Actual Expenses View */}
      {activeTab === 'actuals' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">{error.message || 'Error loading expense records'}</Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider & Invoice</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                        No verified paid expenses recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((exp) => (
                      <TableRow key={exp._id}>
                        <TableCell>
                          <div>
                            <span className="font-semibold text-foreground block">{exp.provider}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {exp.invoiceNumber ? `Ref: ${exp.invoiceNumber}` : 'No invoice ref'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{exp.category.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(exp.paymentDate)}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {formatCurrency(exp.amountInCents, exp.currency)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{exp.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant={exp.paymentStatus === 'PAID' ? 'success' : 'secondary'}>
                            {exp.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(exp._id)}
                              title="Delete Expense Record"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                  <span>
                    Page {meta.page} of {meta.totalPages} ({meta.total} expenses)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Recurring Forecasts View */}
      {activeTab === 'forecasts' && (
        <div className="space-y-4">
          <Alert variant="info" title="Non-Disruptive Liability Forecast Engine">
            These numbers project upcoming monthly subscription renewals over the next 6 months based on active subscription contracts. They do not represent paid expenses until verified invoices are issued and paid.
          </Alert>

          {isForecastLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {forecasts.map((f, i) => (
                <Card key={f.month} className="p-4 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{f.month}</span>
                  <div className="mt-3">
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(f.projectedAmountInCents, f.currency)}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Projected renewals</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Paid Expense"
        description="Log a verified invoice payment with duplicate detection"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          {expenseError && <Alert variant="destructive">{expenseError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Provider</label>
              <Input placeholder="AWS, MongoDB, Stripe" error={errors.provider?.message} {...register('provider')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Category</label>
              <Select
                options={[
                  { value: 'CLOUD_INFRASTRUCTURE', label: 'Cloud Infrastructure' },
                  { value: 'SAAS_TOOL', label: 'SaaS Tool' },
                  { value: 'SOFTWARE_LICENSE', label: 'Software License' },
                  { value: 'API_CREDITS', label: 'API Credits' },
                  { value: 'CONSULTING', label: 'Consulting' },
                  { value: 'HARDWARE', label: 'Hardware' },
                  { value: 'OTHER', label: 'Other' },
                ]}
                {...register('category')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Paid Amount (USD)</label>
              <Input type="number" step="0.01" error={errors.amountDollars?.message} {...register('amountDollars')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Payment Date</label>
              <Input type="date" error={errors.paymentDate?.message} {...register('paymentDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Invoice Reference #</label>
              <Input placeholder="INV-2026-9901" {...register('invoiceNumber')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Payment Method</label>
              <Input placeholder="Corporate Card / Wire" {...register('paymentMethod')} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Notes</label>
            <textarea
              className="w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Accounting PO number or verification notes..."
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Record Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

