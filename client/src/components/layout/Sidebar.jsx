import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  CreditCard,
  Briefcase,
  Share2,
  Cpu,
  Receipt,
  FileBarChart2,
  Users,
  ShieldAlert,
  Settings,
  Bell,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/utils.js';

export const Sidebar = ({ isMobileOpen = false, onMobileClose = () => {}, className }) => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // Close mobile sidebar whenever location/route changes
  useEffect(() => {
    if (isMobileOpen) {
      onMobileClose();
    }
  }, [location.pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onMobileClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onMobileClose]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Resources', href: '/resources', icon: Server },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
    { name: 'Projects', href: '/projects', icon: Briefcase },
    { name: 'Allocations', href: '/allocations', icon: Share2 },
    { name: 'API Credits', href: '/api-credits', icon: Cpu },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Reports', href: '/reports', icon: FileBarChart2 },
    { name: 'Users', href: '/users', icon: Users, adminOnly: true },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert, adminOnly: true },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const filteredNavigation = navigation.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card text-card-foreground select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground">ERSMS</span>
            <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Enterprise Suite</span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Session Quick Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/50 border border-border/50">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-muted-foreground truncate font-mono uppercase">
              {user?.role?.replace('_', ' ') || 'EMPLOYEE'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className={cn('hidden lg:flex flex-col w-64 border-r border-border h-full flex-shrink-0', className)}>
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex flex-col w-72 max-w-[85vw] h-full border-r border-border bg-card shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
