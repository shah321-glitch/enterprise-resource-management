import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Share2, Trash2, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
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
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [terminateConfirmId, setTerminateConfirmId] = useState(null);

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
      const payload = {
        resourceId: formData.resourceId,
        projectId: formData.projectId,
        allocationMethod: formData.allocationMethod,
        allocationValue: Number(formData.allocationValue),
      };
      await api.post('/allocations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setIsModalOpen(false);
      reset();
      toast.success('Resource allocated to project successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to allocate resource');
    },
  });

  // Terminate allocation mutation
  const terminateMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/allocations/${id}/terminate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setTerminateConfirmId(null);
      toast.success('Allocation terminated and capacity returned to resource pool');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to terminate allocation');
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

  const selectedMethod = watch('allocationMethod');
  const allocations = allocationsData || [];
  const resources = resourcesData || [];
  const projects = projectsData || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Allocations"
        description="Safely distribute digital infrastructure, SaaS seats, and cloud costs across projects with percentage limit validation to eliminate double-counting."
        breadcrumbs={[{ label: 'Allocations' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {allocations.length} active assignments
          </Badge>
        }
        actions={
          isProjectManager && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Assign Resource to Project</span>
            </Button>
          )
        }
      />

      {/* Allocation Matrix Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading allocations'}</Alert>
      ) : allocations.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No resource allocations"
          description="None of your digital resources are currently assigned to project initiatives."
          actionLabel={isProjectManager ? 'Create Allocation' : undefined}
          onAction={isProjectManager ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Assigned Project</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Share</TableHead>
              <TableHead>Allocated Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((alloc) => (
              <TableRow key={alloc._id}>
                <TableCell>
                  <div>
                    <span className="font-semibold text-foreground block">{alloc.resourceId?.name || 'Resource'}</span>
                    <span className="text-xs text-muted-foreground">{alloc.resourceId?.provider}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <span className="font-semibold text-foreground block">{alloc.projectId?.name || 'Project'}</span>
                    <span className="text-xs font-mono text-muted-foreground">{alloc.projectId?.code}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{alloc.allocationMethod}</Badge>
                </TableCell>
                <TableCell className="font-mono font-semibold text-foreground">
                  {alloc.allocationMethod === 'PERCENTAGE'
                    ? `${alloc.allocationValue}%`
                    : alloc.allocationValue}
                </TableCell>
                <TableCell className="font-bold text-foreground">
                  {formatCurrency(alloc.allocatedCostInCents, alloc.currency || 'USD')}
                </TableCell>
                <TableCell>
                  <Badge dot variant={alloc.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {alloc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {alloc.status === 'ACTIVE' && isProjectManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTerminateConfirmId(alloc._id)}
                      className="text-xs text-destructive hover:bg-destructive/10"
                    >
                      Release
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Allocation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Allocate Resource to Project"
        description="Define project cost-sharing parameters. Total active percentages across projects cannot exceed 100%."
      >
        <form onSubmit={handleSubmit((formData) => createMutation.mutate(formData))} className="space-y-4">
          <Select
            label="Digital Resource"
            error={errors.resourceId?.message}
            {...register('resourceId')}
            options={[
              { value: '', label: '-- Select Digital Resource --' },
              ...resources.map((r) => ({
                value: r._id,
                label: `${r.name} (${r.provider} - ${formatCurrency(r.costInCents, r.currency)}/mo)`,
              })),
            ]}
          />

          <Select
            label="Target Project"
            error={errors.projectId?.message}
            {...register('projectId')}
            options={[
              { value: '', label: '-- Select Target Project --' },
              ...projects.map((p) => ({
                value: p._id,
                label: `${p.name} [${p.code}] - ${p.department}`,
              })),
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Allocation Method"
              {...register('allocationMethod')}
              options={[
                { value: 'PERCENTAGE', label: 'Percentage (%)' },
                { value: 'EQUAL', label: 'Equal Split' },
                { value: 'FIXED_AMOUNT', label: 'Fixed Dollar Amount' },
                { value: 'USAGE_BASED', label: 'Usage Based' },
              ]}
            />

            <Input
              label={selectedMethod === 'PERCENTAGE' ? 'Percentage Share (%)' : 'Allocation Value'}
              type="number"
              step={selectedMethod === 'PERCENTAGE' ? '1' : '0.01'}
              error={errors.allocationValue?.message}
              {...register('allocationValue')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || isSubmitting}>
              Confirm Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Release Modal */}
      <ConfirmDialog
        isOpen={Boolean(terminateConfirmId)}
        onClose={() => setTerminateConfirmId(null)}
        onConfirm={() => terminateMutation.mutate(terminateConfirmId)}
        isLoading={terminateMutation.isPending}
        title="Terminate Resource Allocation?"
        description="This will release the resource from the project and free its allocated capacity."
        confirmText="Release Allocation"
      />
    </div>
  );
};
