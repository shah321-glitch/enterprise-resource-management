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
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
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
  const toast = useToast();
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
      toast.success('Provider quota synchronization completed');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to sync with provider');
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
      toast.success('Usage consumption recorded successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to record usage');
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
      toast.success('API credit account configured successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create account');
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      provider: 'OpenAI',
      accountIdentifier: 'org-production-team',
      creditModel: 'TOKEN_QUOTA',
      unit: 'TOKENS',
      reportedBalance: 10000000,
      thresholdLimit: 1000000,
    },
  });

  const {
    register: registerUsage,
    handleSubmit: handleUsageSubmit,
    reset: resetUsage,
    formState: { errors: usageErrors, isSubmitting: isRecording },
  } = useForm({
    resolver: zodResolver(usageSchema),
    defaultValues: {
      amount: 1000,
      description: 'Production query batch processing',
    },
  });

  const accounts = data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Credit & Quota Telemetry"
        description="Monitor LLM token balances, HTTP request quotas, monetary balances, and provider-specific consumption thresholds without conflating distinct metrics."
        breadcrumbs={[{ label: 'API Credits' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {accounts.length} monitored accounts
          </Badge>
        }
        actions={
          isProjectManager && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Track API Account</span>
            </Button>
          )
        }
      />

      {/* Credit Accounts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading API credit accounts'}</Alert>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="No API accounts tracked"
          description="Your enterprise has not registered any third-party API quota accounts yet."
          actionLabel={isProjectManager ? 'Add API Account' : undefined}
          onAction={isProjectManager ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const isLow = acc.reportedBalance <= acc.thresholdLimit;

            return (
              <Card key={acc._id} className="flex flex-col justify-between hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <Badge dot variant={isLow ? 'destructive' : 'success'}>
                      {isLow ? 'Low Balance' : 'Normal'}
                    </Badge>
                  </div>
                  <div className="pt-2">
                    <CardTitle className="text-base font-bold text-foreground">{acc.provider}</CardTitle>
                    <CardDescription className="font-mono text-xs truncate">
                      {acc.accountIdentifier}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                        Available Balance:
                      </span>
                      <span className="text-xl font-bold font-mono text-foreground">
                        {acc.creditModel === 'MONETARY'
                          ? formatCurrency(acc.reportedBalance, 'USD')
                          : acc.reportedBalance.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Credit Metric:</span>
                      <Badge variant="outline" className="text-[10px]">
                        {acc.creditModel}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Alert Threshold:</span>
                      <span className="font-mono text-muted-foreground">
                        {acc.creditModel === 'MONETARY'
                          ? formatCurrency(acc.thresholdLimit, 'USD')
                          : acc.thresholdLimit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex justify-between items-center">
                    <span>Last Sync: {formatDate(acc.lastSyncTime)}</span>
                    <Badge variant={acc.syncStatus === 'SYNCED' ? 'success' : 'secondary'}>
                      {acc.syncStatus}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      isLoading={syncMutation.isPending}
                      onClick={() => syncMutation.mutate(acc._id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Sync</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => setUsageAccount(acc)}
                    >
                      <MinusCircle className="h-3.5 w-3.5" />
                      <span>Log Usage</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Record Usage Modal */}
      {usageAccount && (
        <Modal
          isOpen={Boolean(usageAccount)}
          onClose={() => setUsageAccount(null)}
          title={`Log Usage: ${usageAccount.provider}`}
          description={`Record manual consumption against ${usageAccount.accountIdentifier}`}
        >
          <form
            onSubmit={handleUsageSubmit((formData) =>
              recordUsageMutation.mutate({
                id: usageAccount._id,
                amount: Number(formData.amount),
                description: formData.description,
              })
            )}
            className="space-y-4 pt-2"
          >
            <Input
              label={`Consumed Amount (${usageAccount.unit})`}
              type="number"
              step="1"
              error={usageErrors.amount?.message}
              {...registerUsage('amount')}
            />

            <Input
              label="Workload Description / Project Reference"
              placeholder="Batch query execution for production index"
              error={usageErrors.description?.message}
              {...registerUsage('description')}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setUsageAccount(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={recordUsageMutation.isPending || isRecording}>
                Record Usage
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Track Account Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Track API Quota Account"
        description="Monitor multi-model API credits, request quotas, and rate-limited developer accounts"
      >
        <form onSubmit={handleCreateSubmit((formData) => createMutation.mutate(formData))} className="space-y-4">
          <Input
            label="Provider"
            placeholder="e.g. OpenAI, Anthropic, DeepSeek, Twilio"
            error={createErrors.provider?.message}
            {...registerCreate('provider')}
          />

          <Input
            label="Account / Organization Identifier"
            placeholder="e.g. org-corp-production"
            error={createErrors.accountIdentifier?.message}
            {...registerCreate('accountIdentifier')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Credit Model"
              {...registerCreate('creditModel')}
              options={[
                { value: 'TOKEN_QUOTA', label: 'Token Quota (LLMs)' },
                { value: 'REQUEST_QUOTA', label: 'HTTP Request Quota' },
                { value: 'MONETARY', label: 'Monetary Balance (USD)' },
                { value: 'UNIT_QUOTA', label: 'Custom Unit Quota' },
              ]}
            />

            <Input
              label="Unit Label"
              placeholder="e.g. TOKENS, CALLS, CENTS"
              {...registerCreate('unit')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Balance"
              type="number"
              error={createErrors.reportedBalance?.message}
              {...registerCreate('reportedBalance')}
            />

            <Input
              label="Low Balance Alert Threshold"
              type="number"
              error={createErrors.thresholdLimit?.message}
              {...registerCreate('thresholdLimit')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || isCreating}>
              Configure Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
