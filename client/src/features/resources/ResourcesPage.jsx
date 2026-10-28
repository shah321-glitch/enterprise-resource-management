import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Server,
  Filter,
  Eye,
  Archive,
  Trash2,
  DollarSign,
  Calendar,
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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';

const resourceFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  provider: z.string().min(1, 'Provider is required'),
  category: z.enum([
    'CLOUD_INFRASTRUCTURE',
    'SAAS_TOOL',
    'DOMAIN_DNS',
    'DEVELOPER_TOOL',
    'SECURITY',
    'OTHER',
  ]),
  resourceType: z.string().default('General Resource'),
  department: z.string().default('Engineering'),
  costDollars: z.coerce.number().min(0, 'Cost must be non-negative'),
  currency: z.string().default('USD'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).default('ACTIVE'),
  description: z.string().optional(),
});

export const ResourcesPage = () => {
  const { isProjectManager, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Query resources list
  const { data, isLoading, error } = useQuery({
    queryKey: ['resources', page, search, category, status],
    queryFn: async () => {
      const res = await api.get('/resources', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          category: category || undefined,
          status: status || undefined,
        },
      });
      return res.data;
    },
  });

  // Query category summary
  const { data: categorySummaryData } = useQuery({
    queryKey: ['resource-categories-summary'],
    queryFn: async () => {
      const res = await api.get('/resources/categories/summary');
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
        category: formData.category,
        resourceType: formData.resourceType,
        department: formData.department,
        costInCents,
        currency: formData.currency,
        status: formData.status,
        description: formData.description,
      };
      await api.post('/resources', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-categories-summary'] });
      setIsCreateOpen(false);
      reset();
      toast.success('Digital resource registered successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create resource');
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/resources/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource status updated to archived');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to archive resource');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-categories-summary'] });
      setDeleteConfirmId(null);
      toast.success('Resource deleted permanently');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete resource');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      name: '',
      provider: 'AWS',
      category: 'CLOUD_INFRASTRUCTURE',
      resourceType: 'Compute & Storage',
      department: 'Engineering',
      costDollars: 0,
      currency: 'USD',
      status: 'ACTIVE',
      description: '',
    },
  });

  const resources = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1, page: 1, limit: 10 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Resources"
        description="Comprehensive inventory of enterprise cloud servers, SaaS accounts, domains, licenses, and security tools."
        breadcrumbs={[{ label: 'Resources' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {meta.total} assets
          </Badge>
        }
        actions={
          isProjectManager && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Add Resource</span>
            </Button>
          )
        }
      />

      {/* Category Cost Breakdown Cards */}
      {categorySummaryData && categorySummaryData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categorySummaryData.map((cat) => (
            <Card key={cat._id} className="bg-card/60 hover:bg-card transition-colors">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground truncate block">
                  {cat._id?.replace('_', ' ') || 'OTHER'}
                </span>
                <p className="text-base font-bold text-foreground">
                  {formatCurrency(cat.totalCostInCents, 'USD')}
                </p>
                <span className="text-[11px] text-muted-foreground block">
                  {cat.count} {cat.count === 1 ? 'item' : 'items'}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="bg-card/75">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Input
              startIcon={Search}
              placeholder="Search by resource name, provider, or type..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Categories' },
                { value: 'CLOUD_INFRASTRUCTURE', label: 'Cloud Infrastructure' },
                { value: 'SAAS_TOOL', label: 'SaaS Tool' },
                { value: 'DEVELOPER_TOOL', label: 'Developer Tool' },
                { value: 'SECURITY', label: 'Security' },
                { value: 'DOMAIN_DNS', label: 'Domain & DNS' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resources Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading resources'}</Alert>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No resources found"
          description={
            search || category || status
              ? 'No digital assets match your filter criteria. Try adjusting your search query.'
              : 'Your enterprise has not registered any digital resources yet.'
          }
          actionLabel={isProjectManager ? 'Add First Resource' : undefined}
          onAction={isProjectManager ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Monthly Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((res) => (
                <TableRow key={res._id}>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-foreground block">{res.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {res.provider} &bull; {res.resourceType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{res.category.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{res.department}</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {formatCurrency(res.costInCents, res.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      dot
                      variant={
                        res.status === 'ACTIVE'
                          ? 'success'
                          : res.status === 'MAINTENANCE'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {res.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedResource(res)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => archiveMutation.mutate(res._id)}
                            title="Archive Resource"
                          >
                            <Archive className="h-4 w-4 text-amber-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(res._id)}
                            title="Delete Resource"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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

      {/* Create Resource Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register Digital Resource"
        description="Add a new digital asset, cloud service, or tool to company inventory"
      >
        <form onSubmit={handleSubmit((formData) => createMutation.mutate(formData))} className="space-y-4">
          <Input
            label="Resource Name"
            placeholder="e.g. AWS Production EKS"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Provider"
              placeholder="AWS, GitHub, Figma"
              error={errors.provider?.message}
              {...register('provider')}
            />
            <Select
              label="Category"
              error={errors.category?.message}
              {...register('category')}
              options={[
                { value: 'CLOUD_INFRASTRUCTURE', label: 'Cloud Infrastructure' },
                { value: 'SAAS_TOOL', label: 'SaaS Tool' },
                { value: 'DEVELOPER_TOOL', label: 'Developer Tool' },
                { value: 'SECURITY', label: 'Security' },
                { value: 'DOMAIN_DNS', label: 'Domain & DNS' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Resource Type"
              placeholder="e.g. PostgreSQL Cluster"
              {...register('resourceType')}
            />
            <Input
              label="Department"
              placeholder="e.g. Core Engineering"
              {...register('department')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly Cost (USD)"
              type="number"
              step="0.01"
              error={errors.costDollars?.message}
              {...register('costDollars')}
            />
            <Select
              label="Initial Status"
              {...register('status')}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description / Notes</label>
            <textarea
              className="flex w-full rounded-xl border border-input bg-card/60 px-3 py-2 text-xs sm:text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={3}
              placeholder="Operational details, cluster region, IAM accounts..."
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || isSubmitting}>
              Register Resource
            </Button>
          </div>
        </form>
      </Modal>

      {/* Resource Detail Modal */}
      {selectedResource && (
        <Modal
          isOpen={Boolean(selectedResource)}
          onClose={() => setSelectedResource(null)}
          title={selectedResource.name}
          description={`${selectedResource.provider} • ${selectedResource.resourceType}`}
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-muted-foreground block mb-0.5">Category</span>
                <span className="font-semibold text-foreground">{selectedResource.category}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-muted-foreground block mb-0.5">Department</span>
                <span className="font-semibold text-foreground">{selectedResource.department}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-muted-foreground block mb-0.5">Monthly Cost</span>
                <span className="font-semibold text-foreground text-sm">
                  {formatCurrency(selectedResource.costInCents, selectedResource.currency)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-muted-foreground block mb-0.5">Status</span>
                <Badge
                  dot
                  variant={selectedResource.status === 'ACTIVE' ? 'success' : 'secondary'}
                >
                  {selectedResource.status}
                </Badge>
              </div>
            </div>

            {selectedResource.description && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Description</span>
                <p className="text-xs text-foreground bg-secondary/30 p-3 rounded-xl border border-border leading-relaxed">
                  {selectedResource.description}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-3 flex justify-between border-t border-border">
              <span>Created: {formatDate(selectedResource.createdAt)}</span>
              <span>Updated: {formatDate(selectedResource.updatedAt)}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirmId)}
        isLoading={deleteMutation.isPending}
        title="Permanently Delete Resource?"
        description="This will permanently delete this digital resource record from the company inventory and cannot be recovered."
        confirmText="Delete Resource"
      />
    </div>
  );
};
