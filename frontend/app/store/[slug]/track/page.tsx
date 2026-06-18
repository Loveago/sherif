'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ShoppingBag,
  Phone,
  Search,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  BarChart3,
  Shield,
  Wifi,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Storefront } from '@/lib/types';

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-5 w-5 text-amber-400" />,
  PROCESSING: <Clock className="h-5 w-5 text-blue-400" />,
  SUCCESSFUL: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  FAILED: <XCircle className="h-5 w-5 text-rose-400" />,
  CANCELLED: <XCircle className="h-5 w-5 text-rose-400" />,
  REFUNDED: <CheckCircle2 className="h-5 w-5 text-violet-400" />,
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SUCCESSFUL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  REFUNDED: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

type StorefrontResponse = { storefront: Storefront };

type TrackedOrder = {
  orderId: string;
  status: string;
  phoneNumber: string;
  createdAt: string;
  amount: number;
  product: {
    name: string;
    dataSize: string;
    network: string;
  };
};

export default function StorefrontTrackPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [method, setMethod] = useState<'orderId' | 'phone'>('orderId');
  const [orderId, setOrderId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [date, setDate] = useState('');
  const [triggered, setTriggered] = useState(false);

  const { data } = useQuery({
    queryKey: ['public-storefront', slug],
    queryFn: () => apiRequest<StorefrontResponse>(`/store/${slug}`),
    enabled: Boolean(slug),
  });

  const { data: orders, isFetching, isError } = useQuery({
    queryKey: ['storefront-track', slug, method, orderId, phoneNumber, date, triggered],
    queryFn: () => {
      const params = new URLSearchParams();
      if (method === 'orderId' && orderId.trim()) params.set('orderId', orderId.trim().toUpperCase());
      if (method === 'phone' && phoneNumber.trim()) params.set('phoneNumber', phoneNumber.trim());
      if (date) params.set('date', date);
      return apiRequest<TrackedOrder[]>(`/store/${slug}/orders?${params.toString()}`);
    },
    enabled: Boolean(slug && triggered),
  });

  const handleTrack = () => {
    if (method === 'orderId' && !orderId.trim()) return;
    if (method === 'phone' && !phoneNumber.trim()) return;
    setTriggered((prev) => !prev);
  };

  const storefront = data?.storefront;

  return (
    <div className="relative min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 pb-24 pt-6 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold md:text-2xl">
                  {storefront?.displayName || 'LOFAQ Data Hub'}
                </h1>
                <p className="text-xs text-blue-100 md:text-sm">
                  {storefront?.tagline || 'Affordable data bundles · AFA registration · Result checker vouchers'}
                </p>
              </div>
            </div>
            {storefront?.contactPhone && (
              <a
                href={`tel:${storefront.contactPhone}`}
                className="hidden items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/30 md:inline-flex"
              >
                <Phone className="h-4 w-4" /> {storefront.contactPhone}
              </a>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-6 flex max-w-md rounded-full bg-slate-900/60 p-1.5 backdrop-blur-md">
            <Link
              href={`/store/${slug}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              <BarChart3 className="h-4 w-4" /> DATA
            </Link>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-blue-700 shadow-sm">
              <Search className="h-4 w-4" /> TRACK
            </button>
          </div>
        </div>
      </div>

      {/* Tracking Card */}
      <main className="relative mx-auto -mt-16 max-w-5xl px-4 pb-16 md:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 md:text-xl">Track Your Order</h2>
              <p className="text-sm text-slate-500">
                Search by order ID or phone number with optional date filter.
              </p>
            </div>
          </div>

          {/* Method selector */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:max-w-md">
            <button
              onClick={() => setMethod('orderId')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                method === 'orderId'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              <Package className="h-4 w-4" /> Order ID
            </button>
            <button
              onClick={() => setMethod('phone')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                method === 'phone'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              <Phone className="h-4 w-4" /> Phone Number
            </button>
          </div>

          {/* Inputs */}
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div className="relative">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                {method === 'orderId' ? 'Order ID' : 'Phone Number'}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {method === 'orderId' ? <Package className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                </span>
                <Input
                  value={method === 'orderId' ? orderId : phoneNumber}
                  onChange={(e) =>
                    method === 'orderId' ? setOrderId(e.target.value.toUpperCase()) : setPhoneNumber(e.target.value)
                  }
                  placeholder={method === 'orderId' ? 'STORE-XXXX-XXXXXX' : '05XXXXXXXX'}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Order Date</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Calendar className="h-4 w-4" />
                </span>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleTrack}
                disabled={isFetching}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 md:w-auto"
              >
                <Search className="h-4 w-4" />
                {isFetching ? 'Tracking...' : 'Track Order'}
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="mt-8">
            {isError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                <XCircle className="mx-auto h-8 w-8 text-rose-500" />
                <p className="mt-2 text-sm font-medium text-rose-700">Unable to track orders.</p>
                <p className="text-xs text-rose-600">Please check your details and try again.</p>
              </div>
            )}

            {orders && orders.length === 0 && !isFetching && !isError && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                <Search className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">No orders found</p>
                <p className="text-xs text-slate-500">Try a different order ID, phone number, or date.</p>
              </div>
            )}

            {orders && orders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {orders.length} {orders.length === 1 ? 'order' : 'orders'} found
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {orders.map((order) => (
                    <div
                      key={order.orderId}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{order.orderId}</p>
                          <p className="text-xs text-slate-500">{order.product.network} · {order.product.dataSize}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusColors[order.status] || 'bg-slate-100 text-slate-600'}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Phone</p>
                          <p className="font-medium text-slate-900">{order.phoneNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Amount</p>
                          <p className="font-medium text-slate-900">GHS {formatCurrency(order.amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Product</p>
                          <p className="font-medium text-slate-900">{order.product.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Date</p>
                          <p className="font-medium text-slate-900">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        {statusIcons[order.status]}
                        <span className="text-xs">
                          {order.status === 'SUCCESSFUL'
                            ? 'Delivered successfully'
                            : order.status === 'PENDING'
                            ? 'Waiting for processing'
                            : order.status === 'PROCESSING'
                            ? 'Currently being processed'
                            : 'Order failed or cancelled'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back to store */}
        <Link
          href={`/store/${slug}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="font-semibold text-slate-900">{storefront?.displayName || 'LOFAQ Data Hub'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-4 w-4 text-emerald-500" /> Secured</span>
            <span className="inline-flex items-center gap-1.5"><Wifi className="h-4 w-4 text-blue-500" /> Instant delivery</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
