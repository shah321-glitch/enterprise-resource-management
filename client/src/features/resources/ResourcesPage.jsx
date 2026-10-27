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
  ExternalLink,
  DollarSign,
  Calendar,
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
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/resources/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
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
  const meta = data?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Digital Resources</h1>
          <p className="text-sm text-muted-foreground">
            Inventory management of cloud assets, SaaS subscriptions, licenses, and DNS records
          </p>
        </div>

        {isProjectManager && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Add Resource</span>
          </Button>
        )}
      </div>

      {/* Category Cost Breakdown Cards */}
      {categorySummaryData && categorySummaryData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categorySummaryData.slice(0, 6).map((cat) => (
            <div key={cat._id} className="p-3 rounded-xl border border-border bg-card/60 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase truncate">
                {cat._id.replace('_', ' ')}
              </span>
              <div className="mt-2">
                <p className="text-base font-bold text-foreground">{formatCurrency(cat.totalCostInCents)}</p>
                <span className="text-[10px] text-muted-foreground">{cat.count} asset{cat.count > 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, provider, description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading resources'}</Alert>
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
              {resources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    No resources match the selected criteria
                  </TableCell>
                </TableRow>
              ) : (
                resources.map((res) => (
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
                      <Badge variant={res.status === 'ACTIVE' ? 'success' : res.status === 'MAINTENANCE' ? 'warning' : 'secondary'}>
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
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
              <span>
                Showing page {meta.page} of {meta.totalPages} ({meta.total} total assets)
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

      {/* Create Resource Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register Digital Resource"
        description="Add a new digital asset, cloud service, or tool to company inventory"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Resource Name</label>
            <Input placeholder="e.g. AWS Production EKS" error={errors.name?.message} {...register('name')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Provider</label>
              <Input placeholder="AWS, GitHub, Figma" error={errors.provider?.message} {...register('provider')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Category</label>
              <Select
                options={[
                  { value: 'CLOUD_INFRASTRUCTURE', label: 'Cloud Infrastructure' },
                  { value: 'SAAS_TOOL', label: 'SaaS Tool' },
                  { value: 'DEVELOPER_TOOL', label: 'Developer Tool' },
                  { value: 'SECURITY', label: 'Security' },
                  { value: 'DOMAIN_DNS', label: 'Domain & DNS' },
                  { value: 'OTHER', label: 'Other' },
                ]}
                {...register('category')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Resource Type</label>
              <Input placeholder="VM, API Key, License" {...register('resourceType')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Department</label>
              <Input placeholder="Engineering, DevOps" {...register('department')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Base Cost (USD)</label>
              <Input type="number" step="0.01" error={errors.costDollars?.message} {...register('costDollars')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <Select
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'MAINTENANCE', label: 'Maintenance' },
                ]}
                {...register('status')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Description / Notes</label>
            <textarea
              className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Operational details, SLAs, or server specs..."
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Create Resource
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Resource Detail Modal */}
      {selectedResource && (
        <Modal
          isOpen={Boolean(selectedResource)}
          onClose={() => setSelectedResource(null)}
          title={selectedResource.name}
          description={`${selectedResource.provider} • ${selectedResource.resourceType}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-secondary/50 border border-border">
              <div>
                <span className="text-xs text-muted-foreground block">Category</span>
                <span className="font-semibold text-foreground">{selectedResource.category.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Department</span>
                <span className="font-semibold text-foreground">{selectedResource.department}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Cost</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedResource.costInCents, selectedResource.currency)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Status</span>
                <Badge variant={selectedResource.status === 'ACTIVE' ? 'success' : 'secondary'}>
                  {selectedResource.status}
                </Badge>
              </div>
            </div>

            {selectedResource.description && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Description</span>
                <p className="text-sm text-foreground bg-muted/20 p-2.5 rounded-lg border border-border">
                  {selectedResource.description}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2 flex justify-between border-t border-border">
              <span>Created: {formatDate(selectedResource.createdAt)}</span>
              <span>Updated: {formatDate(selectedResource.updatedAt)}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          title="Confirm Permanent Deletion"
          description="Are you sure you want to permanently delete this resource record? This action cannot be undone."
        >
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirmId)}
            >
              Delete Permanently
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
