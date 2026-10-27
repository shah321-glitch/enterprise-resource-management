import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import { DashboardLayout } from './components/layout/DashboardLayout.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';

import { LoginPage } from './features/auth/LoginPage.jsx';
import { RegisterPage } from './features/auth/RegisterPage.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { ResourcesPage } from './features/resources/ResourcesPage.jsx';
import { SubscriptionsPage } from './features/subscriptions/SubscriptionsPage.jsx';
import { ProjectsPage } from './features/projects/ProjectsPage.jsx';
import { AllocationsPage } from './features/allocations/AllocationsPage.jsx';
import { ApiCreditsPage } from './features/api-credits/ApiCreditsPage.jsx';
import { ExpensesPage } from './features/expenses/ExpensesPage.jsx';
import { ReportsPage } from './features/reports/ReportsPage.jsx';
import { UsersPage } from './features/users/UsersPage.jsx';
import { AuditLogsPage } from './features/audit-logs/AuditLogsPage.jsx';
import { SettingsPage } from './features/settings/SettingsPage.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="allocations" element={<AllocationsPage />} />
                <Route path="api-credits" element={<ApiCreditsPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="reports" element={<ReportsPage />} />

                {/* Role Protected Admin Modules */}
                <Route
                  path="users"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

