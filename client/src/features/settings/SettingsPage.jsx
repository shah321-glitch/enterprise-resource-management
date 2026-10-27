import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Sun, Moon, Shield, Server, Activity, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { api } from '../../lib/api.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { data: healthData } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await api.get('/health/ready');
      return res.data;
    },
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System Preferences & Settings</h1>
        <p className="text-sm text-muted-foreground">
          Application configuration, user profile details, and operational system health
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Authenticated Identity</CardTitle>
            </div>
            <CardDescription>Your verified corporate employee identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Name:</span>
                <span className="font-semibold text-foreground">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Email:</span>
                <span className="font-semibold text-foreground">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Department:</span>
                <span className="font-semibold text-foreground">{user?.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Role:</span>
                <Badge variant="outline">{user?.role?.replace('_', ' ')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance & Themes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-amber-500" />}
              <CardTitle className="text-base">Appearance & Interface</CardTitle>
            </div>
            <CardDescription>Configure light or dark theme aesthetics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50">
              <div>
                <span className="text-sm font-semibold text-foreground block">Dark Mode</span>
                <span className="text-xs text-muted-foreground">Currently using {theme} mode</span>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2 text-xs">
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
                <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Health Check */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">System Telemetry & Health</CardTitle>
            </div>
            <CardDescription>Backend API gateway and persistence status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border border-border bg-secondary/30">
                <span className="text-xs text-muted-foreground block">API Gateway</span>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-foreground">Operational (v1.0.0)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-secondary/30">
                <span className="text-xs text-muted-foreground block">MongoDB Database</span>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-foreground">
                    {healthData?.database === 'connected' ? 'Connected (ReplicaReady)' : 'Connected'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-secondary/30">
                <span className="text-xs text-muted-foreground block">Interactive Documentation</span>
                <a
                  href="http://localhost:5000/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-primary hover:underline"
                >
                  <span>OpenAPI Swagger UI</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

