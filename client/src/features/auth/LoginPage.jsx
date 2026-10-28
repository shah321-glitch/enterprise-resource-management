import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Lock, Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { api } from '../../lib/api.js';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid enterprise email address'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginPage = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState(null);

  // Forgot / Reset password state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState('REQUEST'); // 'REQUEST' | 'RESET'
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const [resetError, setResetError] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@enterprise.internal',
      password: 'Admin#2026!Secure',
    },
  });

  const onSubmit = async (data) => {
    setAuthError(null);
    try {
      await login(data.email, data.password);
      toast?.success('Welcome to ERSMS Enterprise Portal');
      navigate(from, { replace: true });
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError('Please enter your registered email address');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    setResetMessage(null);
    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail });
      setResetMessage(res.data.message || 'Reset token generated');
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
      setResetStep('RESET');
    } catch (err) {
      setResetError(err.response?.data?.error?.message || 'Failed to request password reset');
    } finally {
      setResetLoading(false);
    }
  };

  const handleExecuteReset = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setResetError('Both reset token and new password are required');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword,
      });
      toast?.success(res.data.message || 'Password reset successfully');
      setIsResetOpen(false);
      setResetStep('REQUEST');
      setResetEmail('');
      setResetToken('');
      setNewPassword('');
    } catch (err) {
      setResetError(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const setCredentials = (email, password) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 mb-2">
            <Layers className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ERSMS Portal</h1>
          <p className="text-sm text-muted-foreground">
            Enterprise Resource & Subscription Management System
          </p>
        </div>

        <Card className="border-border shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>Enter enterprise credentials to access your dashboard</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {authError && <Alert variant="destructive">{authError}</Alert>}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Enterprise Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@enterprise.internal"
                    className="pl-9"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetOpen(true);
                      setResetStep('REQUEST');
                      setResetError(null);
                      setResetMessage(null);
                    }}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    className="pl-9"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
                Sign In
              </Button>
            </CardContent>
          </form>

          {/* Quick Demo Login Credentials */}
          <CardFooter className="flex flex-col space-y-3 pt-2 border-t border-border/60">
            <div className="w-full text-center">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Demo Switcher
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => setCredentials('superadmin@enterprise.internal', 'Admin#2026!Secure')}
                className="px-2.5 py-1.5 rounded-lg border border-border text-left hover:bg-secondary text-[11px] transition-colors"
              >
                <span className="font-semibold block text-foreground">Super Admin</span>
                <span className="text-muted-foreground text-[10px]">superadmin@...</span>
              </button>
              <button
                type="button"
                onClick={() => setCredentials('admin@enterprise.internal', 'Admin#2026!Secure')}
                className="px-2.5 py-1.5 rounded-lg border border-border text-left hover:bg-secondary text-[11px] transition-colors"
              >
                <span className="font-semibold block text-foreground">Admin</span>
                <span className="text-muted-foreground text-[10px]">admin@...</span>
              </button>
              <button
                type="button"
                onClick={() => setCredentials('pm@enterprise.internal', 'Manager#2026!Secure')}
                className="px-2.5 py-1.5 rounded-lg border border-border text-left hover:bg-secondary text-[11px] transition-colors"
              >
                <span className="font-semibold block text-foreground">Project Mgr</span>
                <span className="text-muted-foreground text-[10px]">pm@...</span>
              </button>
              <button
                type="button"
                onClick={() => setCredentials('engineer@enterprise.internal', 'Employee#2026!Secure')}
                className="px-2.5 py-1.5 rounded-lg border border-border text-left hover:bg-secondary text-[11px] transition-colors"
              >
                <span className="font-semibold block text-foreground">Employee</span>
                <span className="text-muted-foreground text-[10px]">engineer@...</span>
              </button>
            </div>
            <div className="text-center pt-2">
              <span className="text-xs text-muted-foreground">
                Enterprise Accounts are provisioned by System Administrators
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-foreground">
                  {resetStep === 'REQUEST' ? 'Reset Enterprise Password' : 'Enter New Password'}
                </h3>
              </div>
              <button
                onClick={() => setIsResetOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {resetError && <Alert variant="destructive">{resetError}</Alert>}
            {resetMessage && <Alert variant="default">{resetMessage}</Alert>}

            {resetStep === 'REQUEST' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Enter your verified enterprise email. A cryptographically secure, expiring reset token will be dispatched.
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email Address</label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="user@enterprise.internal"
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="ghost" type="button" onClick={() => setIsResetOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={resetLoading}>
                    Generate Token
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleExecuteReset} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Enter the secure reset token and your new password. All existing sessions will be invalidated upon reset.
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Reset Token</label>
                  <Input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="64-character token"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, mixed case, numbers, symbol"
                    required
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setResetStep('REQUEST')}
                    className="flex items-center gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </Button>
                  <Button type="submit" isLoading={resetLoading}>
                    Update Password
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
