'use client';

import { CheckCircle2, XCircle, Clock, Wallet, ArrowUpRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { formatCurrency } from '@/lib/utils';
import type { Order } from '@/lib/types';

const statusIcons: Record<string, React.ReactNode> = {
  SUCCESSFUL: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  FAILED: <XCircle className="h-4 w-4 text-rose-400" />,
  PENDING: <Clock className="h-4 w-4 text-amber-400" />,
  PROCESSING: <Clock className="h-4 w-4 text-sky-400" />,
};

const networkColors: Record<string, string> = {
  MTN: 'bg-yellow-500/20 text-yellow-400',
  Telecel: 'bg-rose-500/20 text-rose-400',
  AirtelTigo: 'bg-sky-500/20 text-sky-400',
};

export function TransactionList({
  title,
  orders,
  onViewAll,
}: {
  title: string;
  orders: Order[];
  onViewAll?: () => void;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-sm text-violet-400 hover:text-violet-300">
            View all
          </button>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {orders.slice(0, 5).map((order) => {
          const networkCode = order.product?.network?.code || 'MTN';
          return (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${networkColors[networkCode] || 'bg-gray-700 text-gray-300'}`}>
                  <span className="text-xs font-bold">{networkCode.slice(0, 2)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{order.product?.name || 'Data Bundle'}</p>
                  <p className="text-xs text-gray-500">{order.phoneNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {order.status === 'FAILED' ? '-' : ''}{formatCurrency(order.amount)}
                </p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  {statusIcons[order.status] || <Clock className="h-3 w-3 text-gray-500" />}
                  <span className="text-xs text-gray-400 capitalize">{order.status.toLowerCase()}</span>
                </div>
              </div>
            </div>
          );
        })}
        {orders.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">No recent transactions</p>
        )}
      </div>
    </GlassCard>
  );
}
