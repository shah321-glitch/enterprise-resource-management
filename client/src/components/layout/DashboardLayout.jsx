import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';

export const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
