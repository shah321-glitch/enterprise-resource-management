import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Sun,
  Moon,
  Search,
  LogOut,
  Shield,
  AlertTriangle,
  Info,
  Menu,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/utils.js';
import { SearchModal } from './SearchModal.jsx';
import { Dropdown, DropdownItem, DropdownDivider } from '../ui/Dropdown.jsx';

export const Header = ({ onMobileToggle = () => {} }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch in-app notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=8');
      return res.data;
    },
    refetchInterval: 30000,
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

  // Generate dynamic breadcrumb label
  const routeTitles = {
    '/': 'Dashboard',
    '/resources': 'Digital Resources',
    '/subscriptions': 'Subscriptions',
    '/projects': 'Projects',
    '/allocations': 'Resource Allocations',
    '/api-credits': 'API Credits & Quotas',
    '/expenses': 'Expenses Management',
    '/reports': 'Business Reports',
    '/users': 'User Management',
    '/notifications': 'Notification Center',
    '/audit-logs': 'Security Audit Trail',
    '/settings': 'System Settings',
  };

  const currentTitle = routeTitles[location.pathname] || 'Enterprise System';

  return (
    <>
      <header className="h-16 border-b border-border bg-card/75 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Left: Mobile Toggle & Page Title / Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileToggle}
            aria-label="Open mobile navigation"
            className="lg:hidden p-2 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-block text-xs font-medium text-muted-foreground">ERSMS</span>
            <ChevronRight className="hidden md:inline-block h-3 w-3 text-muted-foreground/60" />
            <h2 className="text-sm font-bold text-foreground tracking-tight">{currentTitle}</h2>
          </div>
        </div>

        {/* Center: Global Search Entry Point */}
        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-4 hidden sm:block">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground flex items-center justify-between hover:bg-secondary transition-all group"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span>Search resources, projects, bills...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-card border border-border text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right: Controls & Menus */}
        <div className="flex items-center gap-2">
          {/* Mobile search icon button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            className="sm:hidden h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              aria-label="Notifications"
              className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground relative transition-colors"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl py-2 z-50 animate-in fade-in-0 zoom-in-95">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
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
                          <span className="text-[10px] text-muted-foreground/80 mt-1 block font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-border bg-secondary/30 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-medium text-primary hover:underline block"
                  >
                    View all alerts in Notifications Center →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown Menu */}
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-border hover:bg-secondary transition-colors">
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline-block text-xs font-semibold text-foreground max-w-[100px] truncate">
                  {user?.name || 'Account'}
                </span>
              </button>
            }
          >
            {({ close }) => (
              <>
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-xs font-bold text-foreground truncate">{user?.name || 'Administrator'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'admin@enterprise.internal'}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-primary" />
                    <span className="text-[9px] uppercase font-bold text-primary tracking-wider">
                      {user?.role?.replace('_', ' ') || 'EMPLOYEE'}
                    </span>
                  </div>
                </div>

                <DropdownItem
                  icon={SettingsIcon}
                  onClick={() => {
                    close();
                  }}
                >
                  <Link to="/settings" className="w-full block">System Settings</Link>
                </DropdownItem>

                <DropdownDivider />

                <DropdownItem
                  variant="destructive"
                  icon={LogOut}
                  onClick={() => {
                    close();
                    logout();
                  }}
                >
                  Log Out
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </header>

      {/* Global Command Palette / Search Dialog */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
