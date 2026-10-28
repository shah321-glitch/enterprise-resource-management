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
  DollarSign,
  Calendar,
  AlertCircle,
  FileText,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';

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
  const { isProjectManager } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('actuals'); // 'actuals' | 'forecasts'
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch actual expenses
  const { data: actualsData, isLoading: isLoadingActuals, error: actualsError } = useQuery({
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

  // Fetch forecasts
  const { data: forecastData, isLoading: isLoadingForecasts } = useQuery({
    queryKey: ['expense-forecasts'],
    queryFn: async () => {
      const res = await api.get('/expenses/forecasts');
      return res.data.data;
    },
    enabled: activeTab === 'forecasts',
  });

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const amountInCents = Math.round(Number(formData.amountDollars) * 100);
      const payload = {
        provider: formData.provider,
        category: formData.category,
        amountInCents,
        currency: formData.currency,
        paymentDate: new Date(formData.paymentDate).toISOString(),
        invoiceNumber: formData.invoiceNumber || undefined,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        paymentStatus: 'PAID',
      };
      await api.post('/expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsCreateOpen(false);
      reset();
      toast.success('Verified expense invoice recorded successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to record expense');
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
      provider: 'Amazon Web Services',
      category: 'CLOUD_INFRASTRUCTURE',
      amountDollars: 2450.0,
      currency: 'USD',
      paymentDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      paymentMethod: 'Corporate ACH',
      notes: '',
    },
  });

  const expenses = actualsData?.data || [];
  const meta = actualsData?.meta || { total: 0, totalPages: 1 };
  const forecasts = forecastData?.forecasts || [];
  const forecastTotal = forecastData?.totalProjectedCents || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management & Audit"
        description="Strict financial segregation of verified paid actuals versus recurring subscription forecasts to maintain audit compliance and avoid double-counting."
        breadcrumbs={[{ label: 'Expenses' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {meta.total} paid records
          </Badge>
        }
        actions={
          isProjectManager && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Log Paid Expense</span>
            </Button>
          )
        }
      />

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('actuals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'actuals'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Verified Paid Actuals</span>
        </button>
        <button
          onClick={() => setActiveTab('forecasts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'forecasts'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Subscription Cost Forecasts</span>
        </button>
      </div>

      {activeTab === 'actuals' ? (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="bg-card/75">
            <CardContent className="p-4 flex gap-3">
              <div className="w-full sm:w-64">
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
                    { value: 'API_CREDITS', label: 'API Credits' },
                    { value: 'SOFTWARE_LICENSE', label: 'Software License' },
                    { value: 'CONSULTING', label: 'Consulting' },
                    { value: 'HARDWARE', label: 'Hardware' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actuals Table */}
          {isLoadingActuals ? (
            <TableSkeleton rows={6} cols={6} />
          ) : actualsError ? (
            <Alert variant="destructive">{actualsError.message || 'Error loading expenses'}</Alert>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No paid expenses recorded"
              description="No official paid receipts or settlement records have been entered yet."
              actionLabel={isProjectManager ? 'Log Expense' : undefined}
              onAction={isProjectManager ? () => setIsCreateOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp._id}>
                      <TableCell className="font-medium text-foreground">
                        {formatDate(exp.paymentDate)}
                      </TableCell>
                      <TableCell className="font-semibold">{exp.provider}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{exp.category?.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {exp.invoiceNumber || '—'}
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {formatCurrency(exp.amountInCents, exp.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge dot variant="success">
                          {exp.paymentStatus || 'PAID'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Pagination
                currentPage={page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                pageSize={10}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      ) : (
        /* Forecasts Tab */
        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-primary">Monthly Projected Liability</span>
                <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                  {formatCurrency(forecastTotal, 'USD')}
                </p>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {forecasts.length} Active Subscriptions
              </Badge>
            </CardContent>
          </Card>

          {isLoadingForecasts ? (
            <TableSkeleton rows={5} cols={4} />
          ) : forecasts.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No recurring forecasts"
              description="No active recurring subscription contracts are currently registered."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Contract</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Expected Charge</TableHead>
                  <TableHead className="text-right">Projected Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecasts.map((f, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-foreground">{f.name}</TableCell>
                    <TableCell className="text-xs uppercase text-muted-foreground font-medium">
                      {f.frequency}
                    </TableCell>
                    <TableCell>{formatDate(f.nextRenewalDate)}</TableCell>
                    <TableCell className="text-right font-bold font-mono text-foreground">
                      {formatCurrency(f.estimatedCostInCents, 'USD')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Log Expense Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Paid Expense Invoice"
        description="Enter settlement confirmation for actual paid vendor invoice or corporate card transaction"
      >
        <form onSubmit={handleSubmit((formData) => createMutation.mutate(formData))} className="space-y-4">
          <Input
            label="Provider / Vendor"
            placeholder="e.g. Amazon Web Services, Datadog"
            error={errors.provider?.message}
            {...register('provider')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Expense Category"
              {...register('category')}
              options={[
                { value: 'CLOUD_INFRASTRUCTURE', label: 'Cloud Infrastructure' },
                { value: 'SAAS_TOOL', label: 'SaaS Tool' },
                { value: 'API_CREDITS', label: 'API Credits' },
                { value: 'SOFTWARE_LICENSE', label: 'Software License' },
                { value: 'CONSULTING', label: 'Consulting' },
                { value: 'HARDWARE', label: 'Hardware' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <Input
              label="Amount Paid (USD)"
              type="number"
              step="0.01"
              error={errors.amountDollars?.message}
              {...register('amountDollars')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              error={errors.paymentDate?.message}
              {...register('paymentDate')}
            />
            <Input
              label="Invoice Number / Reference"
              placeholder="e.g. INV-2026-99881"
              {...register('invoiceNumber')}
            />
          </div>

          <Input
            label="Payment Method"
            placeholder="e.g. Corporate ACH, Amex Corp Card"
            {...register('paymentMethod')}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Audit Notes / Receipt URL</label>
            <textarea
              className="flex w-full rounded-xl border border-input bg-card/60 px-3 py-2 text-xs sm:text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={2}
              placeholder="Wire reference, PO number, accounting notes..."
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || isSubmitting}>
              Record Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
