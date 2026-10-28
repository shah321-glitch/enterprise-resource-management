import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  CheckCheck,
  Trash2,
  Filter,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';

export const NotificationsPage = () => {
  const [filter, setFilter] = useState('ALL');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const url = filter === 'UNREAD' ? '/notifications?unreadOnly=true' : '/notifications?limit=50';
      const res = await api.get(url);
      return res.data;
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update notifications');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'CRITICAL') return n.severity === 'CRITICAL';
    if (filter === 'WARNING') return n.severity === 'WARNING';
    if (filter === 'INFO') return n.severity === 'INFO';
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications Center"
        description="Review system alerts, upcoming subscription renewals, credit quota warnings, and resource events."
        breadcrumbs={[{ label: 'Notifications' }]}
        badge={
          unreadCount > 0 ? (
            <Badge variant="destructive" className="font-mono text-xs">
              {unreadCount} unread
            </Badge>
          ) : (
            <Badge variant="success" className="text-xs">
              All caught up
            </Badge>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                isLoading={markAllReadMutation.isPending}
                className="gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark All as Read</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        <Filter className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />
        {[
          { key: 'ALL', label: 'All Alerts' },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'CRITICAL', label: 'Critical' },
          { key: 'WARNING', label: 'Warnings' },
          { key: 'INFO', label: 'Info' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              filter === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={
            filter === 'UNREAD'
              ? 'You have read all pending notifications.'
              : 'There are no active notifications for this filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const severityIcons = {
              CRITICAL: <AlertTriangle className="h-5 w-5 text-destructive" />,
              WARNING: <AlertTriangle className="h-5 w-5 text-amber-500" />,
              INFO: <Info className="h-5 w-5 text-blue-500" />,
            };

            const severityBadges = {
              CRITICAL: <Badge variant="destructive">Critical</Badge>,
              WARNING: <Badge variant="warning">Warning</Badge>,
              INFO: <Badge variant="secondary">Info</Badge>,
            };

            return (
              <div
                key={n._id}
                className={cn(
                  'p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
                  n.isRead
                    ? 'border-border bg-card/60'
                    : 'border-primary/30 bg-primary/5 shadow-sm'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                    {severityIcons[n.severity] || severityIcons.INFO}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">{n.title}</h4>
                      {severityBadges[n.severity]}
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[11px] text-muted-foreground/75 mt-2 block font-mono">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markReadMutation.mutate(n._id)}
                      className="gap-1.5 text-xs text-primary hover:text-primary"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Read</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

