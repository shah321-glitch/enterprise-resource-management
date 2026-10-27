import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, ShieldCheck, UserX, UserCheck, Shield } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('EMPLOYEE');

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const res = await api.get('/users', { params: { search: search || undefined } });
      return res.data.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      await api.patch(`/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }) => {
      await api.put(`/users/${id}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const users = data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management & Access Control</h1>
          <p className="text-sm text-muted-foreground">
            Manage employee access, role promotions, and active session enforcement
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search employees by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Failed to load user roster'}</Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>System Role</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u._id}>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-foreground block">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.department}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.role === 'SUPER_ADMIN'
                          ? 'destructive'
                          : u.role === 'ADMIN'
                          ? 'warning'
                          : u.role === 'PROJECT_MANAGER'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {u.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'success' : 'destructive'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isSuperAdmin && u._id !== currentUser._id && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setEditingUser(u);
                              setNewRole(u.role);
                            }}
                          >
                            Edit Role
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={u.isActive ? 'text-destructive text-xs' : 'text-emerald-500 text-xs'}
                            isLoading={statusMutation.isPending && statusMutation.variables?.id === u._id}
                            onClick={() => statusMutation.mutate({ id: u._id, isActive: !u.isActive })}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
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
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={`Edit Permissions: ${editingUser.name}`}
          description="Adjust role privileges across the enterprise application"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Select System Role</label>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                options={[
                  { value: 'SUPER_ADMIN', label: 'Super Admin (Full Access & User Governance)' },
                  { value: 'ADMIN', label: 'Admin (Resource, Subscription, Expense Management)' },
                  { value: 'PROJECT_MANAGER', label: 'Project Manager (Allocation & Projects)' },
                  { value: 'EMPLOYEE', label: 'Employee (Read-Only & Assigned Resources)' },
                ]}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                isLoading={roleMutation.isPending}
                onClick={() => roleMutation.mutate({ id: editingUser._id, role: newRole })}
              >
                Save Role Change
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

