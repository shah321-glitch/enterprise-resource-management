import React from 'react';
import { NavLink } from 'react-router-dom';
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
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/utils.js';

export const Sidebar = ({ className }) => {
  const { user, isAdmin, isProjectManager } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Resources', href: '/resources', icon: Server },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
    { name: 'Projects', href: '/projects', icon: Briefcase },
    { name: 'Allocations', href: '/allocations', icon: Share2 },
    { name: 'API Credits', href: '/api-credits', icon: Cpu },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Reports', href: '/reports', icon: FileBarChart2 },
    ...(isAdmin ? [{ name: 'Users', href: '/users', icon: Users }] : []),
    ...(isAdmin ? [{ name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert }] : []),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className={cn('flex flex-col w-64 border-r border-border bg-card text-card-foreground', className)}>
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-foreground">ERSMS</span>
          <span className="block text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Enterprise Suite</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
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
      </div>

      {/* User Session Quick Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-sm text-foreground">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

