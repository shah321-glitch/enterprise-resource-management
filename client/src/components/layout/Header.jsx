import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Sun,
  Moon,
  Search,
  LogOut,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/utils.js';

export const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Fetch in-app notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=10');
      return res.data;
    },
    refetchInterval: 30000, // Poll every 30s
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notificationsData?.unreadCount || 0;
  const notifications = notificationsData?.data || [];

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Global Search Bar */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search resources, subscriptions, projects..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            aria-label="Notifications"
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground relative transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-xl py-2 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={cn(
                        'p-3.5 hover:bg-secondary/40 transition-colors flex gap-3 text-left',
                        !n.isRead && 'bg-primary/5'
                      )}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {n.severity === 'CRITICAL' ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : n.severity === 'WARNING' ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{user?.name}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-xl py-2 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wide">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2.5 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
