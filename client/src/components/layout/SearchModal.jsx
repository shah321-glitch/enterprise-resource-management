import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
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
  X,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';

export const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const searchableItems = [
    { name: 'Dashboard Overview', category: 'Navigation', href: '/', icon: LayoutDashboard, keywords: 'metrics stats kpi home' },
    { name: 'Digital Resources', category: 'Inventory', href: '/resources', icon: Server, keywords: 'servers saas cloud domains licenses aws gcp' },
    { name: 'Subscriptions & Renewals', category: 'Financial', href: '/subscriptions', icon: CreditCard, keywords: 'billing renew plans recurring monthly yearly' },
    { name: 'Projects', category: 'Management', href: '/projects', icon: Briefcase, keywords: 'initiatives teams managers' },
    { name: 'Resource Allocations', category: 'Allocation', href: '/allocations', icon: Share2, keywords: 'percentages fixed usage distribution' },
    { name: 'API Credits & Quotas', category: 'Infrastructure', href: '/api-credits', icon: Cpu, keywords: 'tokens requests balances quotas openapi anthropic' },
    { name: 'Expenses Management', category: 'Financial', href: '/expenses', icon: Receipt, keywords: 'invoices payments receipts costs' },
    { name: 'Business Reports & Exports', category: 'Analytics', href: '/reports', icon: FileBarChart2, keywords: 'csv pdf excel summary expenditure' },
    { name: 'User Management (RBAC)', category: 'Administration', href: '/users', icon: Users, keywords: 'roles permissions employees superadmin' },
    { name: 'Security Audit Logs', category: 'Security', href: '/audit-logs', icon: ShieldAlert, keywords: 'events compliance security trail' },
    { name: 'Notification Center', category: 'Alerts', href: '/notifications', icon: Bell, keywords: 'unread renewals low credits warnings' },
    { name: 'System Settings', category: 'Preferences', href: '/settings', icon: Settings, keywords: 'theme currency notifications preferences' },
  ];

  const filteredItems = searchableItems.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (href) => {
    navigate(href);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex].href);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search command palette"
        className="relative z-50 w-full max-w-xl rounded-2xl border border-border bg-card p-0 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-border gap-3">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search modules..."
            className="w-full h-14 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded border border-border bg-secondary text-muted-foreground">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No matching modules or navigation targets found for &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.href}
                  onClick={() => handleSelect(item.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center',
                        isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{item.name}</p>
                      <p
                        className={cn(
                          'text-[10px]',
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}
                      >
                        {item.category}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className={cn(
                      'h-4 w-4 opacity-0 transition-opacity',
                      isSelected && 'opacity-100'
                    )}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-secondary/50 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-card rounded border border-border">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-card rounded border border-border">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-card rounded border border-border">↵</kbd> to open
            </span>
          </div>
          <span>ERSMS Command Palette</span>
        </div>
      </div>
    </div>
  );
};

