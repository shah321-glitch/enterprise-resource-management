import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6 bg-background">
        <div className="space-y-4 w-72 text-center">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Authenticating enterprise session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !hasRole(roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md mt-2">
          Your account role (<span className="font-semibold text-foreground">{user.role}</span>) does not have authorization to view this enterprise module. Contact a Super Administrator for role elevation.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => window.history.back()}>
          Return to previous screen
        </Button>
      </div>
    );
  }

  return children;
};
