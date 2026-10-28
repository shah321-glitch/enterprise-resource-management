import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Briefcase, DollarSign, Calendar, Layers, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

const projectSchema = z.object({
  name: z.string().min(2, 'Project name is required'),
  code: z.string().min(2, 'Project code is required').toUpperCase(),
  department: z.string().default('Engineering'),
  budgetDollars: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
});

export const ProjectsPage = () => {
  const { isProjectManager } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', search],
    queryFn: async () => {
      const res = await api.get('/projects', { params: { search: search || undefined } });
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const budgetInCents = Math.round(Number(formData.budgetDollars) * 100);
      await api.post('/projects', {
        name: formData.name,
        code: formData.code,
        department: formData.department,
        budgetInCents,
        description: formData.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateOpen(false);
      reset();
      toast.success('Corporate project initiated successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create project');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      code: '',
      department: 'Engineering',
      budgetDollars: 10000,
      description: '',
    },
  });

  const projects = data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Management"
        description="Organize internal strategic initiatives, allocate digital resources, control project-specific budgets, and monitor multi-department cost distribution."
        breadcrumbs={[{ label: 'Projects' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {projects.length} initiatives
          </Badge>
        }
        actions={
          isProjectManager && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          )
        }
      />

      {/* Search Input */}
      <Card className="bg-card/75">
        <CardContent className="p-4">
          <Input
            startIcon={Search}
            placeholder="Search projects by name, code, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading projects'}</Alert>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No projects found"
          description={
            search
              ? 'No projects match your search keywords.'
              : 'There are no active company projects registered in the system yet.'
          }
          actionLabel={isProjectManager ? 'Create First Project' : undefined}
          onAction={isProjectManager ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <Card key={proj._id} className="hover:shadow-md transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <Badge dot variant={proj.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {proj.status}
                  </Badge>
                </div>
                <div className="pt-2">
                  <CardTitle className="text-base font-bold text-foreground">{proj.name}</CardTitle>
                  <CardDescription className="font-mono text-xs text-primary font-medium">
                    {proj.code} &bull; {proj.department}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {proj.description || 'Enterprise project initiative.'}
                </p>

                <div className="p-3 bg-secondary/50 rounded-xl border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Authorized Budget:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(proj.budgetInCents, proj.currency || 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="text-muted-foreground">{formatDate(proj.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Initiate Enterprise Project"
        description="Create an authorized project container to assign digital resources and project members"
      >
        <form onSubmit={handleSubmit((formData) => createMutation.mutate(formData))} className="space-y-4">
          <Input
            label="Project Name"
            placeholder="e.g. NextGen Core Platform"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Project Code"
              placeholder="e.g. PRJ-CORE"
              error={errors.code?.message}
              {...register('code')}
            />
            <Input
              label="Department"
              placeholder="e.g. Platform Engineering"
              {...register('department')}
            />
          </div>

          <Input
            label="Total Authorized Budget (USD)"
            type="number"
            step="100"
            error={errors.budgetDollars?.message}
            {...register('budgetDollars')}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description / Objectives</label>
            <textarea
              className="flex w-full rounded-xl border border-input bg-card/60 px-3 py-2 text-xs sm:text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={3}
              placeholder="Strategic goals, allocated team size, quarterly deliverables..."
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || isSubmitting}>
              Initiate Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
