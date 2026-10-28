import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  CreditCard,
  RotateCw,
  XCircle,
  Eye,
  Calendar,
  AlertTriangle,
  History,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatCurrency, formatDate, getDaysRemaining } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';

const subscriptionFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  provider: z.string().min(1, 'Provider is required'),
  plan: z.string().default('Standard'),
  billingFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME', 'CUSTOM']).default('MONTHLY'),
  nextRenewalDate: z.string().min(1, 'Renewal date is required'),
  costDollars: z.coerce.number().min(0, 'Cost must be positive'),
  currency: z.string().default('USD'),
  autoRenew: z.boolean().default(true),
});

export const SubscriptionsPage = () => {
  const { isProjectManager, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Filters & State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [renewingSub, setRenewingSub] = useState(null);
  const [cancellingSub, setCancellingSub] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);

  // Fetch subscriptions
  const { data, isLoading, error } = useQuery({
    queryKey: ['subscriptions', page, search, status, billingFrequency],
    queryFn: async () => {
      const res = await api.get('/subscriptions', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: status || undefined,
          billingFrequency: billingFrequency || undefined,
        },
      });
      return res.data;
    },
  });

  // Fetch upcoming renewals
  const { data: upcomingData } = useQuery({
    queryKey: ['subscriptions-upcoming-renewals'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/upcoming-renewals?days=30');
      return res.data.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const costInCents = Math.round(Number(formData.costDollars) * 100);
      const payload = {
        name: formData.name,
        provider: formData.provider,
        plan: formData.plan,
        billingFrequency: formData.billingFrequency,
        nextRenewalDate: new Date(formData.nextRenewalDate).toISOString(),
        costInCents,
        currency: formData.currency,
        autoRenew: formData.autoRenew,
      };
      await api.post('/subscriptions', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-upcoming-renewals'] });
      setIsCreateOpen(false);
      reset();
      toast.success('Subscription registered successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to register subscription');
    },
  });

  // Renew mutation
  const renewMutation = useMutation({
    mutationFn: async ({ id, invoiceNumber, amountPaidCents }) => {
      await api.post(`/subscriptions/${id}/renew`, {
        invoiceNumber,
        amountPaidCents,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-upcoming-renewals'] });
      setRenewingSub(null);
      toast.success('Subscription renewal processed and billing cycle advanced');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to process renewal');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      await api.post(`/subscriptions/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-upcoming-renewals'] });
      setCancellingSub(null);
      setCancelReason('');
      toast.success('Subscription marked as cancelled');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel subscription');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: '',
      provider: 'GitHub',
      plan: 'Enterprise Team',
      billingFrequency: 'MONTHLY',
      nextRenewalDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      costDollars: 0,
      currency: 'USD',
      autoRenew: true,
    },
  });

  const subscriptions = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };
  const upcomingRenewals = upcomingData || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Management"
        description="Monitor multi-vendor SaaS recurring plans, track billing intervals, prevent duplicate charges, and schedule proactive renewal reminders."
        breadcrumbs={[{ label: 'Subscriptions' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {meta.total} subscriptions
          </Badge>
        }
        actions={
          isProjectManager && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>New Subscription</span>
            </Button>
          )
        }
      />

      {/* Upcoming Renewal Alert Banner */}
      {upcomingRenewals.length > 0 && (
        <Alert variant="warning" title="Upcoming Renewals Due (Next 30 Days)">
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
            {upcomingRenewals.slice(0, 3).map((sub) => (
              <span key={sub._id} className="inline-flex items-center gap-1 font-semibold">
                &bull; {sub.name} ({formatCurrency(sub.costInCents, sub.currency)}) due on {formatDate(sub.nextRenewalDate)}
              </span>
            ))}
            {upcomingRenewals.length > 3 && <span>and {upcomingRenewals.length - 3} more...</span>}
          </div>
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card className="bg-card/75">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              startIcon={Search}
              placeholder="Search by subscription name or provider..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'TRIAL', label: 'Trial' },
                { value: 'PENDING_RENEWAL', label: 'Pending Renewal' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              value={billingFrequency}
              onChange={(e) => {
                setBillingFrequency(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Frequencies' },
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'QUARTERLY', label: 'Quarterly' },
                { value: 'YEARLY', label: 'Yearly' },
                { value: 'ONE_TIME', label: 'One-Time' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading subscriptions'}</Alert>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions found"
          description={
            search || status || billingFrequency
              ? 'No subscription contracts match the selected filters.'
              : 'Your enterprise has not registered any recurring subscriptions yet.'
          }
          actionLabel={isProjectManager ? 'Add First Subscription' : undefined}
          onAction={isProjectManager ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Renewal Due</TableHead>
                <TableHead>Auto Renew</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => {
                const daysLeft = getDaysRemaining(sub.nextRenewalDate);
                const isUpcoming = daysLeft <= 30 && daysLeft >= 0 && sub.status === 'ACTIVE';

                return (
                  <TableRow key={sub._id}>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-foreground block">{sub.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {sub.provider} &bull; {sub.plan}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs uppercase font-medium">
                      {sub.billingFrequency}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(sub.costInCents, sub.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-foreground text-xs font-medium">{formatDate(sub.nextRenewalDate)}</span>
                        {isUpcoming && (
                          <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.autoRenew ? 'success' : 'secondary'}>
                        {sub.autoRenew ? 'Auto' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        dot
                        variant={
                          sub.status === 'ACTIVE'
                            ? 'success'
                            : sub.status === 'CANCELLED'
                            ? 'destructive'
                            : sub.status === 'EXPIRED'
                            ? 'destructive'
                            : 'warning'
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedSub(sub)}
                          title="View History & Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {sub.status !== 'CANCELLED' && isProjectManager && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRenewingSub(sub)}
                            title="Process Manual Renewal"
                          >
                            <RotateCw className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {sub.status !== 'CANCELLED' && isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCancellingSub(sub)}
                            title="Cancel Subscription"
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={10}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add SaaS Subscription"
        description="Register a recurring vendor contract, license, or tooling subscription"
      >
        <form onSubmit={handleSubmit((formData) => createMutation.mutate(formData))} className="space-y-4">
          <Input
            label="Subscription Name"
            placeholder="e.g. GitHub Enterprise Cloud"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Provider"
              placeholder="e.g. GitHub, OpenAI, Figma"
              error={errors.provider?.message}
              {...register('provider')}
            />
            <Input
              label="Plan Tier"
              placeholder="e.g. Enterprise, Team, Pro"
              {...register('plan')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Billing Interval"
              {...register('billingFrequency')}
              options={[
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'QUARTERLY', label: 'Quarterly' },
                { value: 'YEARLY', label: 'Yearly' },
                { value: 'ONE_TIME', label: 'One-Time' },
              ]}
            />
            <Input
              label="Next Renewal Date"
              type="date"
              error={errors.nextRenewalDate?.message}
              {...register('nextRenewalDate')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost (USD)"
              type="number"
              step="0.01"
              error={errors.costDollars?.message}
              {...register('costDollars')}
            />
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-secondary/40 border border-border cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                  {...register('autoRenew')}
                />
                <span className="text-xs font-semibold text-foreground">Auto-Renewal Enabled</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || isSubmitting}>
              Create Subscription
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manual Renewal Modal */}
      {renewingSub && (
        <Modal
          isOpen={Boolean(renewingSub)}
          onClose={() => setRenewingSub(null)}
          title={`Process Renewal: ${renewingSub.name}`}
          description="Advance billing cycle and record verified renewal invoice"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-secondary/50 rounded-xl border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Renewal Amount:</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(renewingSub.costInCents, renewingSub.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Renewal Due:</span>
                <span className="font-semibold text-foreground">{formatDate(renewingSub.nextRenewalDate)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Invoice / Reference # (Optional)</label>
              <Input id="renewal-invoice" placeholder="INV-2026-00123" />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setRenewingSub(null)}>
                Cancel
              </Button>
              <Button
                isLoading={renewMutation.isPending}
                onClick={() => {
                  const inv = document.getElementById('renewal-invoice')?.value;
                  renewMutation.mutate({
                    id: renewingSub._id,
                    invoiceNumber: inv || undefined,
                    amountPaidCents: renewingSub.costInCents,
                  });
                }}
              >
                Confirm Renewal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Modal */}
      {cancellingSub && (
        <Modal
          isOpen={Boolean(cancellingSub)}
          onClose={() => setCancellingSub(null)}
          title={`Cancel Subscription: ${cancellingSub.name}`}
          description="Mark subscription as cancelled to halt recurring forecasts and notification alerts."
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Cancellation Reason</label>
              <textarea
                className="flex w-full rounded-xl border border-input bg-card/60 px-3 py-2 text-xs sm:text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={3}
                placeholder="e.g. Replaced by internal service, team no longer requires seats..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setCancellingSub(null)}>
                Back
              </Button>
              <Button
                variant="destructive"
                isLoading={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    id: cancellingSub._id,
                    reason: cancelReason || 'Admin manual cancellation',
                  })
                }
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Details & History Modal */}
      {selectedSub && (
        <Modal
          isOpen={Boolean(selectedSub)}
          onClose={() => setSelectedSub(null)}
          title={selectedSub.name}
          description={`${selectedSub.provider} • ${selectedSub.plan} Plan`}
          className="max-w-2xl"
        >
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-0.5">Frequency</span>
                <span className="font-semibold text-foreground">{selectedSub.billingFrequency}</span>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-0.5">Recurring Cost</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedSub.costInCents, selectedSub.currency)}
                </span>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-0.5">Auto-Renew</span>
                <span className="font-semibold text-foreground">{selectedSub.autoRenew ? 'Enabled' : 'Manual'}</span>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-0.5">Status</span>
                <Badge
                  dot
                  variant={selectedSub.status === 'ACTIVE' ? 'success' : 'secondary'}
                >
                  {selectedSub.status}
                </Badge>
              </div>
            </div>

            {/* Billing History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                <span>Historical Billing Cycles</span>
              </h4>
              {selectedSub.billingHistory && selectedSub.billingHistory.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-secondary/60 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-2.5 font-semibold">Date</th>
                        <th className="p-2.5 font-semibold">Invoice #</th>
                        <th className="p-2.5 font-semibold">Amount</th>
                        <th className="p-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedSub.billingHistory.map((bh, idx) => (
                        <tr key={idx} className="hover:bg-secondary/30">
                          <td className="p-2.5">{formatDate(bh.renewalDate)}</td>
                          <td className="p-2.5 font-mono">{bh.invoiceNumber || 'N/A'}</td>
                          <td className="p-2.5 font-semibold">{formatCurrency(bh.amountInCents, selectedSub.currency)}</td>
                          <td className="p-2.5">
                            <Badge variant={bh.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                              {bh.paymentStatus || 'PAID'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-border">
                  No previous renewal billing cycles recorded yet.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t border-border">
              <span>Next Renewal: {formatDate(selectedSub.nextRenewalDate)}</span>
              <span>Updated: {formatDate(selectedSub.updatedAt)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
