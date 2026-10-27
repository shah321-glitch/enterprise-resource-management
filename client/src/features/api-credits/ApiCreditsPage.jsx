import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Cpu,
  RefreshCw,
  AlertTriangle,
  MinusCircle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

const createAccountSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  accountIdentifier: z.string().min(1, 'Account identifier is required'),
  creditModel: z.enum(['MONETARY', 'REQUEST_QUOTA', 'TOKEN_QUOTA', 'UNIT_QUOTA']),
  unit: z.string().default('USD_CENTS'),
  reportedBalance: z.coerce.number().min(0),
  thresholdLimit: z.coerce.number().min(0),
});

const usageSchema = z.object({
  amount: z.coerce.number().positive('Usage amount must be greater than 0'),
  description: z.string().optional(),
});

export const ApiCreditsPage = () => {
  const { isProjectManager } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [usageAccount, setUsageAccount] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['api-credits'],
    queryFn: async () => {
      const res = await api.get('/api-credits');
      return res.data.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/api-credits/${id}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credits'] });
    },
  });

  const recordUsageMutation = useMutation({
    mutationFn: async ({ id, amount, description }) => {
      await api.post(`/api-credits/${id}/usage`, { amount, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credits'] });
      setUsageAccount(null);
      resetUsage();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      await api.post('/api-credits', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credits'] });
      setIsCreateOpen(false);
      resetCreate();
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreateSubmitting },
  } = useForm({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      provider: 'OpenAI',
      accountIdentifier: '',
      creditModel: 'TOKEN_QUOTA',
      unit: 'TOKENS',
      reportedBalance: 1000000,
      thresholdLimit: 200000,
    },
  });

  const {
    register: registerUsage,
    handleSubmit: handleUsageSubmit,
    reset: resetUsage,
    formState: { errors: usageErrors, isSubmitting: isUsageSubmitting },
  } = useForm({
    resolver: zodResolver(usageSchema),
    defaultValues: { amount: 1000, description: 'Batch model evaluation' },
  });

  const accounts = data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">API Credits & Quota Pools</h1>
          <p className="text-sm text-muted-foreground">
            Strict isolation of monetary balances, HTTP request quotas, and LLM token pools with automated sync
          </p>
        </div>

        {isProjectManager && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Register Account</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading API credit accounts'}</Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No API credit pools registered
            </div>
          ) : (
            accounts.map((acc) => {
              const isLow = acc.reportedBalance <= acc.thresholdLimit;
              const formattedBalance =
                acc.unit === 'USD_CENTS'
                  ? formatCurrency(acc.reportedBalance)
                  : acc.reportedBalance.toLocaleString();
              const formattedThreshold =
                acc.unit === 'USD_CENTS'
                  ? formatCurrency(acc.thresholdLimit)
                  : acc.thresholdLimit.toLocaleString();

              return (
                <Card key={acc._id} className={isLow ? 'border-destructive/40 bg-destructive/5' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{acc.creditModel.replace('_', ' ')}</Badge>
                      <Badge variant={isLow ? 'destructive' : 'success'}>
                        {isLow ? 'Low Quota Alert' : 'Healthy'}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{acc.provider}</CardTitle>
                    <CardDescription className="text-xs font-mono">{acc.accountIdentifier}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <span className="text-xs text-muted-foreground block">Available Balance</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-2xl font-extrabold text-foreground">{formattedBalance}</span>
                        <span className="text-xs font-medium text-muted-foreground">{acc.unit}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-1">
                        Alert threshold: {formattedThreshold} {acc.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Synced: {acc.lastSyncAt ? formatDate(acc.lastSyncAt) : 'Never'}</span>
                      </div>
                      <Badge variant={acc.syncStatus === 'SUCCESS' ? 'success' : 'secondary'}>
                        {acc.syncStatus}
                      </Badge>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs gap-1.5"
                        isLoading={syncMutation.isPending && syncMutation.variables === acc._id}
                        onClick={() => syncMutation.mutate(acc._id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Sync Provider</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => setUsageAccount(acc)}
                      >
                        <MinusCircle className="h-3.5 w-3.5" />
                        <span>Record Usage</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Register API Account Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register API Account / Pool"
        description="Add a provider-specific quota or prepaid credit balance"
      >
        <form onSubmit={handleCreateSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Provider</label>
            <Input placeholder="OpenAI, Anthropic, Stripe, AWS" error={createErrors.provider?.message} {...registerCreate('provider')} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Account Identifier / Key Ref</label>
            <Input placeholder="org-corp-01 or acct_prod_123" error={createErrors.accountIdentifier?.message} {...registerCreate('accountIdentifier')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Credit Model</label>
              <Select
                options={[
                  { value: 'TOKEN_QUOTA', label: 'Token Quota (Tokens)' },
                  { value: 'REQUEST_QUOTA', label: 'Request Quota (Requests)' },
                  { value: 'MONETARY', label: 'Monetary Balance (USD Cents)' },
                  { value: 'UNIT_QUOTA', label: 'Custom Compute Credits' },
                ]}
                {...registerCreate('creditModel')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Unit Label</label>
              <Input placeholder="TOKENS, REQUESTS, USD_CENTS" {...registerCreate('unit')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Initial Balance</label>
              <Input type="number" error={createErrors.reportedBalance?.message} {...registerCreate('reportedBalance')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Alert Threshold</label>
              <Input type="number" error={createErrors.thresholdLimit?.message} {...registerCreate('thresholdLimit')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreateSubmitting || createMutation.isPending}>
              Register Pool
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Usage Modal */}
      {usageAccount && (
        <Modal
          isOpen={Boolean(usageAccount)}
          onClose={() => setUsageAccount(null)}
          title={`Record API Usage: ${usageAccount.provider}`}
          description={`Log consumption against ${usageAccount.accountIdentifier} (${usageAccount.unit})`}
        >
          <form
            onSubmit={handleUsageSubmit((data) =>
              recordUsageMutation.mutate({
                id: usageAccount._id,
                amount: data.amount,
                description: data.description,
              })
            )}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Usage Amount ({usageAccount.unit})</label>
              <Input type="number" error={usageErrors.amount?.message} {...registerUsage('amount')} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Operation / Reason</label>
              <Input placeholder="e.g. Daily embedding sync" {...registerUsage('description')} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setUsageAccount(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isUsageSubmitting || recordUsageMutation.isPending}>
                Deduct from Quota
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
