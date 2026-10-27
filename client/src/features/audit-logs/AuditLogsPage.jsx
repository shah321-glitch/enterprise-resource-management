import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Search, Eye, Filter, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';
import { Button } from '../../components/ui/Button.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Alert } from '../../components/ui/Alert.jsx';

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Security Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Immutable event log tracking administrative changes, resource lifecycle actions, and authentication events
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">{error.message || 'Error loading audit logs'}</Alert>
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
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    No audit log records found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-foreground text-xs block">{log.actorEmail || 'System'}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{log.actorRole || 'Internal'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground font-medium">{log.targetType}</span>
                      {log.targetName && (
                        <span className="text-[11px] text-muted-foreground block truncate max-w-[180px]">
                          {log.targetName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.outcome === 'SUCCESS' ? 'success' : 'destructive'}>
                        {log.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} audit events)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Detail JSON Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.action}`}
          description={`Recorded on ${new Date(selectedLog.createdAt).toLocaleString()}`}
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block">Actor</span>
                <span className="font-semibold text-foreground">{selectedLog.actorEmail || 'System'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Role</span>
                <span className="font-semibold text-foreground">{selectedLog.actorRole || 'System'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Target Type</span>
                <span className="font-semibold text-foreground">{selectedLog.targetType}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Target ID</span>
                <span className="font-mono text-foreground truncate block">{selectedLog.targetId || '-'}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-muted-foreground block mb-1">Payload Metadata (Sanitized)</span>
              <pre className="p-3 rounded-lg bg-muted text-foreground overflow-x-auto text-[11px] font-mono border border-border">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
