import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, UserPlus, Shield, UserX, UserCheck, KeyRound, LogOut } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('EMPLOYEE');

  // Provision User Modal State
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionName, setProvisionName] = useState('');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');
  const [provisionRole, setProvisionRole] = useState('EMPLOYEE');
  const [provisionDept, setProvisionDept] = useState('Engineering');

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const res = await api.get('/users', { params: { search: search || undefined } });
      return res.data.data;
    },
  });

  const provisionMutation = useMutation({
    mutationFn: async (userData) => {
      const res = await api.post('/users', userData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsProvisionOpen(false);
      setProvisionName('');
      setProvisionEmail('');
      setProvisionPassword('');
      setProvisionRole('EMPLOYEE');
      toast.success('Enterprise employee account provisioned successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to provision user');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      await api.patch(`/users/${id}/status`, { isActive });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User account ${vars.isActive ? 'activated' : 'deactivated'}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update account status');
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }) => {
      await api.put(`/users/${id}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast.success('User role updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update role');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/users/${id}/revoke-sessions`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Sessions revoked successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to revoke sessions');
    },
  });

  const handleProvisionSubmit = (e) => {
    e.preventDefault();
    provisionMutation.mutate({
      name: provisionName,
      email: provisionEmail,
      password: provisionPassword,
      role: provisionRole,
      department: provisionDept,
    });
  };

  const users = data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access Control (RBAC)"
        description="Oversee company employee accounts, assign granular role-based permissions, and manage active session lifecycles."
        breadcrumbs={[{ label: 'Users' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {users.length} members
          </Badge>
        }
        actions={
          <Button
            onClick={() => setIsProvisionOpen(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Provision Employee
          </Button>
        }
      />

      {/* Search Input */}
      <div className="max-w-md">
        <Input
          startIcon={Search}
          placeholder="Filter by employee name, email, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Failed to load user records'}</Alert>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="No employee accounts match the query."
          action={
            <Button onClick={() => setIsProvisionOpen(true)}>Provision First Account</Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isSelf = u._id === currentUser?._id;
              const roleColors = {
                SUPER_ADMIN: 'destructive',
                ADMIN: 'default',
                PROJECT_MANAGER: 'warning',
                EMPLOYEE: 'secondary',
              };

              return (
                <TableRow key={u._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-foreground">
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block">
                          {u.name} {isSelf && <span className="text-primary text-xs">(You)</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.department || 'General'}</TableCell>
                  <TableCell>
                    <Badge variant={roleColors[u.role] || 'secondary'}>
                      {u.role?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge dot variant={u.isActive ? 'success' : 'secondary'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isSuperAdmin && !isSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser(u);
                            setNewRole(u.role);
                          }}
                          className="text-xs"
                        >
                          Change Role
                        </Button>
                      )}

                      {!isSelf && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeMutation.mutate(u._id)}
                            isLoading={revokeMutation.isPending && revokeMutation.variables === u._id}
                            className="text-xs text-muted-foreground hover:text-foreground"
                            title="Revoke all active sessions for this user"
                          >
                            <LogOut className="h-3.5 w-3.5 mr-1" /> Revoke
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: u._id, isActive: !u.isActive })}
                            className={`text-xs ${u.isActive ? 'text-destructive' : 'text-emerald-500'}`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Provision Employee Modal */}
      {isProvisionOpen && (
        <Modal
          isOpen={isProvisionOpen}
          onClose={() => setIsProvisionOpen(false)}
          title="Provision Enterprise Employee Account"
          description="Create a verified employee account. Credentials can be rotated upon first sign in."
        >
          <form onSubmit={handleProvisionSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Full Name</label>
              <Input
                type="text"
                placeholder="Jane Doe"
                value={provisionName}
                onChange={(e) => setProvisionName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Enterprise Email</label>
              <Input
                type="email"
                placeholder="jane.doe@enterprise.internal"
                value={provisionEmail}
                onChange={(e) => setProvisionEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Temporary Password</label>
              <Input
                type="password"
                placeholder="Min 8 chars, uppercase, number, symbol"
                value={provisionPassword}
                onChange={(e) => setProvisionPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Role</label>
                <Select
                  value={provisionRole}
                  onChange={(e) => setProvisionRole(e.target.value)}
                  options={[
                    { value: 'EMPLOYEE', label: 'Employee' },
                    { value: 'PROJECT_MANAGER', label: 'Project Manager' },
                    { value: 'ADMIN', label: 'Admin' },
                    ...(isSuperAdmin ? [{ value: 'SUPER_ADMIN', label: 'Super Admin' }] : []),
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Department</label>
                <Input
                  type="text"
                  placeholder="Engineering"
                  value={provisionDept}
                  onChange={(e) => setProvisionDept(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="secondary" type="button" onClick={() => setIsProvisionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={provisionMutation.isPending}>
                Create Account
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Role Modal */}
      {editingUser && (
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={`Update Role: ${editingUser.name}`}
          description="Elevate or downgrade system authorization privileges"
        >
          <div className="space-y-4 pt-2">
            <Select
              label="Select Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              options={[
                { value: 'SUPER_ADMIN', label: 'Super Admin (Full Tenant Access)' },
                { value: 'ADMIN', label: 'Admin (Operations & Financial)' },
                { value: 'PROJECT_MANAGER', label: 'Project Manager (Allocations & Requests)' },
                { value: 'EMPLOYEE', label: 'Employee (Read-Only Assigned)' },
              ]}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                isLoading={roleMutation.isPending}
                onClick={() => roleMutation.mutate({ id: editingUser._id, role: newRole })}
              >
                Save Role
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UsersPage;
