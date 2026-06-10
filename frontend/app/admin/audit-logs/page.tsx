'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Clock, User, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: any;
  ipAddress: string;
  userAgent: string;
  status: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-600/20 text-emerald-400',
  UPDATE: 'bg-blue-600/20 text-blue-400',
  DELETE: 'bg-rose-600/20 text-rose-400',
  LOGIN: 'bg-violet-600/20 text-violet-400',
  LOGOUT: 'bg-gray-600/20 text-gray-400',
  APPROVE: 'bg-emerald-600/20 text-emerald-400',
  REJECT: 'bg-rose-600/20 text-rose-400',
};

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: logs = [] } = useQuery({
    queryKey: ['admin-audit-logs', search, actionFilter],
    queryFn: () =>
      apiRequest<AuditLog[]>(
        `/admin/audit-logs?search=${search}&action=${actionFilter}`
      ),
  });

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));

  return (
    <AuthGuard>
      <DashboardShell title="Audit Logs" description="View all system activity and administrative actions." mode="admin">
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <Input
                placeholder="Search by user, resource, or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 hover:border-gray-600/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-slate-900/80"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Logs List */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log
          </h3>

          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-700/50 bg-gray-900/30 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800">
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {log.user.firstName} {log.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{log.user.email}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="default"
                        className={actionColors[log.action] || 'bg-gray-600/20 text-gray-400'}
                      >
                        {log.action}
                      </Badge>
                      <span className="text-sm text-gray-400">on</span>
                      <span className="text-sm font-medium text-white">{log.resource}</span>
                      {log.resourceId && (
                        <>
                          <span className="text-sm text-gray-400">#</span>
                          <span className="text-sm text-gray-500 font-mono">{log.resourceId.slice(0, 8)}</span>
                        </>
                      )}
                    </div>

                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <div className="mt-3 rounded-lg bg-black/20 p-3">
                        <p className="text-xs font-medium text-gray-300 mb-2">Changes:</p>
                        <div className="space-y-1 text-xs text-gray-400">
                          {Object.entries(log.changes).map(([key, value]: [string, any]) => (
                            <div key={key}>
                              <span className="text-gray-500">{key}:</span> {String(value).slice(0, 50)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                    <p className="text-xs text-gray-600">{new Date(log.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                {log.ipAddress && (
                  <div className="text-xs text-gray-600 border-t border-gray-700/50 pt-2">
                    <span className="text-gray-500">IP:</span> {log.ipAddress}
                  </div>
                )}
              </div>
            ))}

            {logs.length === 0 && (
              <p className="py-8 text-center text-gray-500">No audit logs found</p>
            )}
          </div>
        </GlassCard>
      </DashboardShell>
    </AuthGuard>
  );
}
