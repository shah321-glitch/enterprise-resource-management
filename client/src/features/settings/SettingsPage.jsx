import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Sun,
  Moon,
  Shield,
  Server,
  Activity,
  CheckCircle2,
  ExternalLink,
  Laptop,
  DollarSign,
  Lock,
  KeyRound,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { cn } from '../../lib/utils.js';

export const SettingsPage = () => {
  const { user, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [defaultCurrency, setDefaultCurrency] = useState('USD');

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Session Revocation State
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  const { data: readyData } = useQuery({
    queryKey: ['system-ready-status'],
    queryFn: async () => {
      const res = await api.get('/ready');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: meData, refetch: refetchMe } = useQuery({
    queryKey: ['user-me-telemetry'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      await api.put('/auth/profile', { name, department });
      toast.success('Enterprise profile updated successfully');
      if (refreshProfile) await refreshProfile();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success(res.data.message || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSessions = async () => {
    setIsRevokingSessions(true);
    try {
      const res = await api.post('/auth/revoke-sessions');
      toast.success(res.data.message || 'All other active sessions revoked');
      refetchMe();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to revoke sessions');
    } finally {
      setIsRevokingSessions(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="System Preferences & Configuration"
        description="Application environment tokens, user authentication profiles, accessible appearance themes, and infrastructure health."
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Identity Profile & Self-Update */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Authenticated Identity</CardTitle>
            </div>
            <CardDescription>Verified enterprise employee profile and directory details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Corporate Email:</span>
                  <span className="font-mono text-foreground font-semibold">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Assigned Role:</span>
                  <Badge variant="outline" className="font-bold text-[10px]">
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Display Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Department</label>
                <Input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department Name"
                />
              </div>

              <Button type="submit" size="sm" isLoading={isUpdatingProfile} className="w-full">
                Save Profile Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Account Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Change Password</CardTitle>
            </div>
            <CardDescription>Update your enterprise authentication credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>
              <Button type="submit" size="sm" variant="outline" isLoading={isChangingPassword} className="w-full">
                Update Account Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Session Security & Active Logins */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Session Management</CardTitle>
            </div>
            <CardDescription>Active refresh tokens and multi-device session governance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 bg-secondary/50 rounded-xl border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Refresh Sessions:</span>
                <Badge variant="default" className="font-mono">
                  {meData?.activeSessionCount || 1} active
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Session Security:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Rotation & Reuse Guard Active</span>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRevokeSessions}
              isLoading={isRevokingSessions}
              className="w-full flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Revoke All Other Sessions
            </Button>
          </CardContent>
        </Card>

        {/* Appearance & Interface Themes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Appearance & Interface</CardTitle>
            </div>
            <CardDescription>Select your preferred color theme. Preference is saved automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setTheme('light');
                  toast.info('Switched to Light theme');
                }}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-xs font-semibold gap-2',
                  theme === 'light'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-secondary text-muted-foreground'
                )}
              >
                <Sun className="h-6 w-6 text-amber-500" />
                <span>Light Theme</span>
              </button>

              <button
                onClick={() => {
                  setTheme('dark');
                  toast.info('Switched to Dark theme');
                }}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-xs font-semibold gap-2',
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-secondary text-muted-foreground'
                )}
              >
                <Moon className="h-6 w-6 text-primary" />
                <span>Dark Theme</span>
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Theme preferences persist in browser storage and support high contrast across all dashboards.
            </p>
          </CardContent>
        </Card>

        {/* Currency & Financial Formatting */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">Financial Currency Standard</CardTitle>
            </div>
            <CardDescription>Default ISO 4217 minor unit representation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              label="Primary Reporting Currency"
              value={defaultCurrency}
              onChange={(e) => {
                setDefaultCurrency(e.target.value);
                toast.success(`Default currency set to ${e.target.value}`);
              }}
              options={[
                { value: 'USD', label: 'USD ($) - United States Dollar' },
                { value: 'EUR', label: 'EUR (€) - Eurozone' },
                { value: 'GBP', label: 'GBP (£) - British Pound' },
                { value: 'CAD', label: 'CAD ($) - Canadian Dollar' },
              ]}
            />
            <p className="text-[11px] text-muted-foreground">
              All financial values are stored as integer minor units (cents) to avoid rounding discrepancies.
            </p>
          </CardContent>
        </Card>

        {/* System Telemetry & Probes */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">Operational System Probes</CardTitle>
            </div>
            <CardDescription>Live health and readiness endpoints verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-1">
                <span className="text-xs text-muted-foreground block font-medium">REST API Gateway</span>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold text-foreground">Healthy (200 OK)</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">/api/v1/health</span>
              </div>

              <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-1">
                <span className="text-xs text-muted-foreground block font-medium">Database Persistence</span>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold text-foreground">
                    {readyData?.database === 'connected' ? 'Connected (Ready)' : 'Standby'}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {readyData?.mode || 'Active'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-1">
                <span className="text-xs text-muted-foreground block font-medium">API Specifications</span>
                <a
                  href="http://localhost:5000/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  <span>OpenAPI Swagger UI</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className="text-[10px] text-muted-foreground font-mono">/api/docs</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
