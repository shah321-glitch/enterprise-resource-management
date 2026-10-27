import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid enterprise email address'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState(null);

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
      navigate(from, { replace: true });
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
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
                <label className="text-xs font-semibold text-foreground">Password</label>
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
              <Link to="/register" className="text-xs text-primary hover:underline">
                Need an account? Register here
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
