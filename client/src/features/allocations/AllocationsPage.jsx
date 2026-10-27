import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Share2, Trash2, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
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

const allocationSchema = z.object({
  resourceId: z.string().min(1, 'Select a resource'),
  projectId: z.string().min(1, 'Select a project'),
  allocationMethod: z.enum(['PERCENTAGE', 'EQUAL', 'FIXED_AMOUNT', 'USAGE_BASED']).default('PERCENTAGE'),
  allocationValue: z.coerce.number().min(0, 'Allocation value must be >= 0'),
});

export const AllocationsPage = () => {
  const { isProjectManager } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allocationError, setAllocationError] = useState(null);

  // Queries
  const { data: allocationsData, isLoading, error } = useQuery({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await api.get('/allocations');
      return res.data.data;
    },
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['resources-dropdown'],
    queryFn: async () => {
      const res = await api.get('/resources?limit=100');
      return res.data.data;
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-dropdown'],
    queryFn: async () => {
      const res = await api.get('/projects?limit=100');
      return res.data.data;
    },
  });

  // Create allocation mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      await api.post('/allocations', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalOpen(false);
      reset();
    },
    onError: (err) => {
      setAllocationError(err.response?.data?.error?.message || err.message || 'Allocation failed');
    },
  });

  // Terminate allocation mutation
  const terminateMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/allocations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      resourceId: '',
      projectId: '',
      allocationMethod: 'PERCENTAGE',
      allocationValue: 50,
    },
  });

  const watchedResourceId = watch('resourceId');
  const watchedMethod = watch('allocationMethod');
  const watchedValue = watch('allocationValue');

  const selectedResource = resourcesData?.find((r) => r._id === watchedResourceId);

  // Calculate live preview cost
  let previewCost = 0;
  if (selectedResource) {
    if (watchedMethod === 'PERCENTAGE') {
      previewCost = Math.round((selectedResource.costInCents * (watchedValue || 0)) / 100);
    } else if (watchedMethod === 'FIXED_AMOUNT') {
      previewCost = Math.round((watchedValue || 0) * 100);
    } else {
      previewCost = selectedResource.costInCents;
    }
  }

  const allocations = allocationsData || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Resource Allocations</h1>
          <p className="text-sm text-muted-foreground">
            Configure multi-method cost and capacity sharing (Percentage, Equal, Fixed, Usage) across projects
          </p>
        </div>

        {isProjectManager && (
          <Button
            onClick={() => {
              setAllocationError(null);
              setIsModalOpen(true);
            }}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Allocation</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading allocations'}</Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Project Target</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead>Allocated Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                  No active or past resource allocations recorded
                </TableCell>
              </TableRow>
            ) : (
              allocations.map((alloc) => (
                <TableRow key={alloc._id}>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-foreground block">{alloc.resourceId?.name || 'Resource'}</span>
                      <span className="text-xs text-muted-foreground">
                        {alloc.resourceId?.provider} ({formatCurrency(alloc.resourceId?.costInCents)})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{alloc.projectId?.name || 'Project'}</span>
                    <span className="text-xs text-muted-foreground block font-mono">
                      {alloc.projectId?.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{alloc.allocationMethod}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {alloc.allocationMethod === 'PERCENTAGE'
                      ? `${alloc.allocationValue}%`
                      : alloc.allocationMethod === 'FIXED_AMOUNT'
                      ? formatCurrency(alloc.allocationValue)
                      : 'Equal'}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    {formatCurrency(alloc.calculatedCostInCents, alloc.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={alloc.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {alloc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {alloc.status === 'ACTIVE' && isProjectManager && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 text-xs"
                        isLoading={terminateMutation.isPending}
                        onClick={() => terminateMutation.mutate(alloc._id)}
                      >
                        Terminate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Allocation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Allocate Resource to Project"
        description="Share infrastructure cost and capacity with strict non-double-counting guarantees"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          {allocationError && <Alert variant="destructive">{allocationError}</Alert>}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Select Resource</label>
            <Select error={errors.resourceId?.message} {...register('resourceId')}>
              <option value="">-- Choose Resource --</option>
              {resourcesData?.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.provider}) - {formatCurrency(r.costInCents)}/mo
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Assign to Project</label>
            <Select error={errors.projectId?.message} {...register('projectId')}>
              <option value="">-- Choose Project --</option>
              {projectsData?.map((p) => (
                <option key={p._id} value={p._id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Allocation Model</label>
              <Select
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage (%)' },
                  { value: 'EQUAL', label: 'Equal Split' },
                  { value: 'FIXED_AMOUNT', label: 'Fixed Amount ($)' },
                  { value: 'USAGE_BASED', label: 'Usage Based (%)' },
                ]}
                {...register('allocationMethod')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                {watchedMethod === 'PERCENTAGE' || watchedMethod === 'USAGE_BASED'
                  ? 'Value (0 - 100%)'
                  : 'Fixed Amount (USD)'}
              </label>
              <Input
                type="number"
                step="1"
                error={errors.allocationValue?.message}
                {...register('allocationValue')}
              />
            </div>
          </div>

          {/* Real-time preview calculation card */}
          {selectedResource && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Calculated Monthly Cost:</span>
              </div>
              <span className="font-bold text-foreground text-sm">
                {formatCurrency(previewCost, selectedResource.currency)}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Confirm Allocation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

