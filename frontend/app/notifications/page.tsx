'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import type { Notification } from '@/lib/types';
import { Bell, Mail, Wallet, ShoppingCart, AlertCircle } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  ORDER: <ShoppingCart className="h-4 w-4" />,
  WALLET: <Wallet className="h-4 w-4" />,
  REFUND: <AlertCircle className="h-4 w-4" />,
  WITHDRAWAL: <Wallet className="h-4 w-4" />,
  COMPLAINT: <AlertCircle className="h-4 w-4" />,
  ANNOUNCEMENT: <Mail className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  ORDER: 'bg-sky-500/20 text-sky-400',
  WALLET: 'bg-emerald-500/20 text-emerald-400',
  REFUND: 'bg-amber-500/20 text-amber-400',
  WITHDRAWAL: 'bg-violet-500/20 text-violet-400',
  COMPLAINT: 'bg-rose-500/20 text-rose-400',
  ANNOUNCEMENT: 'bg-sky-500/20 text-sky-400',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<Notification[]>('/notifications'),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  return (
    <AuthGuard>
      <DashboardShell title="Notifications" description="Track order updates, wallet changes, refunds and system announcements.">
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Unread</p>
                <h2 className="text-3xl font-bold text-white">{unreadCount}</h2>
              </div>
            </div>
            <Button className="mt-6 w-full" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              {markAllRead.isPending ? 'Marking...' : 'Mark All as Read'}
            </Button>
            <div className="mt-6 space-y-2">
              {['ORDER', 'WALLET', 'REFUND', 'WITHDRAWAL', 'COMPLAINT', 'ANNOUNCEMENT'].map((type) => (
                <div key={type} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${typeColors[type] || 'bg-gray-700 text-gray-300'}`}>
                      {typeIcons[type]}
                    </div>
                    <span className="text-sm text-gray-300">{type}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {notifications.filter((n) => n.type === type).length}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="text-base font-semibold text-white">All Notifications</h3>
            <div className="mt-4 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border p-4 ${
                    notification.status === 'UNREAD'
                      ? 'border-violet-500/20 bg-violet-600/5'
                      : 'border-gray-800 bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${typeColors[notification.type] || 'bg-gray-700 text-gray-300'}`}>
                        {typeIcons[notification.type]}
                      </div>
                      <p className="text-sm font-medium text-white">{notification.title}</p>
                    </div>
                    <Badge value={notification.status} />
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{notification.body}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{new Date(notification.createdAt).toLocaleDateString()}</span>
                    {notification.status === 'UNREAD' && (
                      <button
                        className="text-xs text-violet-400 hover:text-violet-300"
                        onClick={() => markRead.mutate(notification.id)}
                        disabled={markRead.isPending}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">No notifications</p>
              )}
            </div>
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
