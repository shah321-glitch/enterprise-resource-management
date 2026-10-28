import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Search, Eye, Filter, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';

export const AuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: async () => {
      const res = await api.get('/audit-logs', {
        params: {
          page,
          limit: 15,
          action: actionFilter || undefined,
        },
      });
      return res.data;
    },
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Audit Trail"
        description="Append-only immutable record of all authentication attempts, resource modifications, subscription changes, and permission alterations."
        breadcrumbs={[{ label: 'Audit Logs' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {meta.total} audit events
          </Badge>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading audit logs'}</Alert>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No audit events found"
          description="There are no security log entries recorded matching your filter."
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.createdAt, true)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-foreground text-xs block">
                        {log.actorEmail || 'System / Automated'}
                      </span>
                      {log.actorRole && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {log.actorRole}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium text-foreground">{log.targetName || log.targetType || '—'}</span>
                    {log.targetType && (
                      <span className="text-muted-foreground text-[10px] block">
                        Type: {log.targetType}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      dot
                      variant={log.outcome === 'SUCCESS' ? 'success' : 'destructive'}
                    >
                      {log.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedLog(log)}
                      title="Inspect Metadata"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={15}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Inspect Log Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.action}`}
          description={`Logged at ${formatDate(selectedLog.createdAt, true)}`}
          className="max-w-xl"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Actor</span>
                <span className="font-semibold text-foreground">{selectedLog.actorEmail || 'System'}</span>
                <span className="text-muted-foreground text-[10px] block font-mono mt-0.5">
                  Role: {selectedLog.actorRole || 'SYSTEM'}
                </span>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Outcome</span>
                <Badge dot variant={selectedLog.outcome === 'SUCCESS' ? 'success' : 'destructive'} className="mt-1">
                  {selectedLog.outcome}
                </Badge>
              </div>
            </div>

            {selectedLog.ipAddress && (
              <div className="p-3 bg-secondary/50 rounded-xl border border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origin IP:</span>
                  <span className="font-mono text-foreground">{selectedLog.ipAddress}</span>
                </div>
                {selectedLog.userAgent && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User Agent:</span>
                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[280px]">
                      {selectedLog.userAgent}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-1.5">
                Structured Event Metadata
              </span>
              <pre className="p-3 bg-secondary/70 border border-border rounded-xl font-mono text-[11px] overflow-x-auto text-foreground">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
