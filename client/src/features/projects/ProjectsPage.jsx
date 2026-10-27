import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Briefcase, DollarSign, Calendar, Layers } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects Governance</h1>
          <p className="text-sm text-muted-foreground">
            Manage cost centers, project budgets, and allocated digital infrastructure
          </p>
        </div>

        {isProjectManager && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </Button>
        )}
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter projects by title or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Failed to load projects'}</Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No projects created yet
            </div>
          ) : (
            projects.map((proj) => {
              const allocatedCents = proj.allocatedCostInCents || 0;
              const budgetCents = proj.budgetInCents || 0;
              const pct = budgetCents > 0 ? Math.min(100, Math.round((allocatedCents / budgetCents) * 100)) : 0;

              return (
                <Card key={proj._id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {proj.code}
                      </span>
                      <Badge variant={proj.status === 'ACTIVE' ? 'success' : 'secondary'}>{proj.status}</Badge>
                    </div>
                    <CardTitle className="text-base">{proj.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{proj.description || 'No description provided'}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-secondary/40 border border-border">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Budget</span>
                        <span className="font-semibold text-foreground">{formatCurrency(budgetCents)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Allocated/Mo</span>
                        <span className="font-semibold text-foreground">{formatCurrency(allocatedCents)}</span>
                      </div>
                    </div>

                    {/* Budget utilization progress */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Monthly Budget Used</span>
                        <span className="font-semibold text-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct > 90 ? 'bg-destructive' : pct > 75 ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground border-t border-border">
                      <span>{proj.activeResourcesCount || 0} active resources</span>
                      <span>{proj.department}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Project"
        description="Establish an enterprise project for resource and cost assignment"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Project Name</label>
            <Input placeholder="e.g. AI Knowledge Assistant" error={errors.name?.message} {...register('name')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Project Code</label>
              <Input placeholder="PRJ-AI-01" error={errors.code?.message} {...register('code')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Department</label>
              <Input placeholder="Engineering" {...register('department')} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Target Budget (USD)</label>
            <Input type="number" step="100" error={errors.budgetDollars?.message} {...register('budgetDollars')} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <textarea
              className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Strategic goals and architecture scope..."
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

