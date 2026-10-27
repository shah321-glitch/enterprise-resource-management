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
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const costInCents = Math.round(Number(formData.costDollars) * 100);
      await api.post('/subscriptions', {
        ...formData,
        startDate: new Date().toISOString(),
        nextRenewalDate: new Date(formData.nextRenewalDate).toISOString(),
        costInCents,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setIsCreateOpen(false);
      reset();
    },
  });

  // Renew mutation
  const renewMutation = useMutation({
    mutationFn: async (subId) => {
      await api.post(`/subscriptions/${subId}/renew`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setRenewingSub(null);
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ subId, reason }) => {
      await api.post(`/subscriptions/${subId}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setCancellingSub(null);
      setCancelReason('');
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
      provider: 'AWS',
      plan: 'Enterprise',
      billingFrequency: 'MONTHLY',
      nextRenewalDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      costDollars: 100,
      currency: 'USD',
      autoRenew: true,
    },
  });

  const subscriptions = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscriptions & Renewals</h1>
          <p className="text-sm text-muted-foreground">
            Lifecycle tracking, automated 30/15/7/1 day reminders, and non-duplicative renewal records
          </p>
        </div>

        {isProjectManager && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Add Subscription</span>
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by subscription name, provider, plan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading subscriptions'}</Alert>
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
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => {
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
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} subscriptions)
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
        </div>
      )}

      {/* Create Subscription Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Subscription"
        description="Track recurring cloud or software license renewal commitments"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Subscription Name</label>
            <Input placeholder="e.g. Figma Enterprise 30 Seats" error={errors.name?.message} {...register('name')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Provider</label>
              <Input placeholder="AWS, Figma, Datadog" error={errors.provider?.message} {...register('provider')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Plan Tier</label>
              <Input placeholder="Enterprise, Team, Pro" {...register('plan')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Billing Frequency</label>
              <Select
                options={[
                  { value: 'MONTHLY', label: 'Monthly' },
                  { value: 'QUARTERLY', label: 'Quarterly' },
                  { value: 'YEARLY', label: 'Yearly' },
                  { value: 'ONE_TIME', label: 'One-Time' },
                ]}
                {...register('billingFrequency')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Next Renewal Date</label>
              <Input type="date" error={errors.nextRenewalDate?.message} {...register('nextRenewalDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Cost Per Cycle (USD)</label>
              <Input type="number" step="0.01" error={errors.costDollars?.message} {...register('costDollars')} />
            </div>
            <div className="space-y-1 flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input type="checkbox" className="rounded" {...register('autoRenew')} />
                <span>Auto-Renewal Enabled</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Create Subscription
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manual Renewal Confirmation Modal */}
      {renewingSub && (
        <Modal
          isOpen={Boolean(renewingSub)}
          onClose={() => setRenewingSub(null)}
          title="Process Manual Renewal"
          description={`Confirm renewal for ${renewingSub.name} ($${(renewingSub.costInCents / 100).toFixed(2)})`}
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Renewing this subscription will advance its next renewal date by its configured billing frequency (
              <span className="font-semibold text-foreground">{renewingSub.billingFrequency}</span>), record a historical billing entry, and reset renewal reminders. Duplicate renewals within the same hour are safely rejected.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRenewingSub(null)}>
                Cancel
              </Button>
              <Button
                isLoading={renewMutation.isPending}
                onClick={() => renewMutation.mutate(renewingSub._id)}
              >
                Confirm Renewal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingSub && (
        <Modal
          isOpen={Boolean(cancellingSub)}
          onClose={() => setCancellingSub(null)}
          title="Cancel Subscription"
          description={`Mark ${cancellingSub.name} as cancelled`}
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Reason for Cancellation</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Consolidating tooling, reducing headcount, or migrating provider..."
                className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCancellingSub(null)}>
                Back
              </Button>
              <Button
                variant="destructive"
                disabled={!cancelReason.trim()}
                isLoading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ subId: cancellingSub._id, reason: cancelReason })}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Subscription Detail Modal */}
      {selectedSub && (
        <Modal
          isOpen={Boolean(selectedSub)}
          onClose={() => setSelectedSub(null)}
          title={selectedSub.name}
          description={`${selectedSub.provider} • ${selectedSub.plan}`}
        >
          <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <div>
                <span className="text-xs text-muted-foreground block">Cost</span>
                <span className="font-semibold text-foreground">{formatCurrency(selectedSub.costInCents, selectedSub.currency)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Frequency</span>
                <span className="font-semibold text-foreground">{selectedSub.billingFrequency}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Next Renewal</span>
                <span className="font-semibold text-foreground">{formatDate(selectedSub.nextRenewalDate)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Status</span>
                <Badge variant={selectedSub.status === 'ACTIVE' ? 'success' : 'secondary'}>{selectedSub.status}</Badge>
              </div>
            </div>

            {/* Renewal & Billing History */}
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-2">Historical Billing Records</span>
              <div className="space-y-2">
                {!selectedSub.billingHistory || selectedSub.billingHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No historical billing entries logged yet.</p>
                ) : (
                  selectedSub.billingHistory.map((bill, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded border border-border text-xs bg-muted/10">
                      <div>
                        <span className="font-medium text-foreground">{formatDate(bill.billingDate)}</span>
                        <span className="text-muted-foreground ml-2">Ref: {bill.invoiceRef}</span>
                      </div>
                      <span className="font-semibold text-foreground">{formatCurrency(bill.amountInCents, bill.currency)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
