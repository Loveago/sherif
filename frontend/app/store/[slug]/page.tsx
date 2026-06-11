'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, Phone, Search, Shield, Sparkles, Wifi, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import type { Product, Storefront } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type StorefrontResponse = { storefront: Storefront; products: Product[] };
type InitializeStorefrontPaymentResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
  orderId: string;
  amount: number;
};

type StorefrontTrackedOrder = {
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

const networkClassByCode: Record<string, string> = {
  MTN: 'from-amber-500/90 via-orange-500/90 to-amber-600/90',
  TELECEL: 'from-rose-500/90 via-red-500/90 to-pink-500/90',
  AIRTELTIGO: 'from-cyan-500/90 via-blue-500/90 to-indigo-500/90',
};

export default function PublicStorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [selectedNetwork, setSelectedNetwork] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [trackingId, setTrackingId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['public-storefront', slug],
    queryFn: () => apiRequest<StorefrontResponse>(`/store/${slug}`),
    enabled: Boolean(slug),
  });

  const networks = useMemo(() => {
    if (!data?.products) {
      return ['ALL'];
    }

    const unique = Array.from(new Set(data.products.map((product) => product.network.code)));
    return ['ALL', ...unique];
  }, [data?.products]);

  const filteredProducts = useMemo(() => {
    if (!data?.products) {
      return [];
    }

    if (selectedNetwork === 'ALL') {
      return data.products;
    }

    return data.products.filter((product) => product.network.code === selectedNetwork);
  }, [data?.products, selectedNetwork]);

  const checkoutMutation = useMutation({
    mutationFn: (payload: { productId: string; phoneNumber: string; customerEmail?: string }) =>
      apiRequest<InitializeStorefrontPaymentResponse>(`/store/${slug}/paystack/initialize`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (result) => {
      window.location.href = result.authorization_url;
    },
  });

  const trackMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest<StorefrontTrackedOrder>(`/store/${slug}/orders/${encodeURIComponent(orderId)}`),
  });

  if (isLoading || !data) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-300">Loading storefront...</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(56,189,248,0.22),transparent_38%),radial-gradient(circle_at_78%_24%,rgba(244,114,182,0.2),transparent_34%),radial-gradient(circle_at_48%_80%,rgba(251,191,36,0.14),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6">
        <header className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Back to home
              </Link>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" /> {data.storefront.displayName}
              </p>
              <h1 className="mt-4 text-3xl font-bold text-white md:text-5xl">{data.storefront.tagline}</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">{data.storefront.description}</p>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Track Order</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={trackingId}
                  onChange={(event) => setTrackingId(event.target.value.toUpperCase())}
                  placeholder="STORE-JUN1126-735281"
                  className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                />
                <Button
                  className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  onClick={() => trackingId && trackMutation.mutate(trackingId)}
                  disabled={trackMutation.isPending || !trackingId.trim()}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {trackMutation.data && (
                <p className="mt-3 text-xs text-emerald-300">
                  {trackMutation.data.orderId} - {trackMutation.data.status}
                </p>
              )}
              {trackMutation.isError && <p className="mt-3 text-xs text-rose-300">Order not found for this storefront.</p>}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400">Visits</p>
              <p className="mt-1 text-2xl font-bold text-white">{data.storefront.visits}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400">Sales</p>
              <p className="mt-1 text-2xl font-bold text-white">{data.storefront.sales}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400">Conversion</p>
              <p className="mt-1 text-2xl font-bold text-white">{data.storefront.conversionRate}%</p>
            </div>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            {networks.map((network) => (
              <button
                key={network}
                onClick={() => setSelectedNetwork(network)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedNetwork === network
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-white/15 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60'
                }`}
              >
                {network === 'ALL' ? 'All Networks' : network}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filteredProducts.map((product, index) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ delay: index * 0.04 }}
                className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80"
              >
                <div className={`bg-gradient-to-r p-4 ${networkClassByCode[product.network.code] || 'from-violet-500/90 to-cyan-500/90'}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Data Bundle</p>
                  <p className="mt-1 text-2xl font-bold text-white">{product.dataSize}</p>
                  <p className="text-sm text-white/90">{product.network.name}</p>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{product.description}</p>
                  <p className="mt-4 text-3xl font-black text-white">{formatCurrency(product.sellingPrice)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-300">Instant</span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-cyan-300">Secure</span>
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-amber-300">Trusted</span>
                  </div>
                  <Button
                    className="mt-5 w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:from-amber-300 hover:to-orange-400"
                    onClick={() => {
                      setSelectedProduct(product);
                      setPhoneNumber('');
                      setCustomerEmail('');
                    }}
                  >
                    Purchase Now
                  </Button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </section>

        <footer className="mt-8 flex flex-wrap items-center gap-5 rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
          <div className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-300" /> Secured by Paystack</div>
          <div className="inline-flex items-center gap-2"><Wifi className="h-4 w-4 text-cyan-300" /> Real-time order processing</div>
          <div className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-300" /> {data.storefront.contactEmail || 'No email set'}</div>
          <div className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-cyan-300" /> {data.storefront.contactPhone || 'No phone set'}</div>
        </footer>
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl"
            >
              <div className={`bg-gradient-to-r p-4 ${networkClassByCode[selectedProduct.network.code] || 'from-violet-500 to-cyan-500'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/80">Complete Your Order</p>
                    <p className="mt-1 text-xl font-bold text-white">{selectedProduct.network.name} - {selectedProduct.dataSize}</p>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="rounded-lg bg-white/20 p-1 text-white hover:bg-white/30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                  <p className="text-xs text-slate-400">Amount</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(selectedProduct.sellingPrice)}</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">Data Bundle Number</label>
                  <input
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="0551234567"
                    className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">Email (optional)</label>
                  <input
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                {checkoutMutation.isError && (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    Unable to start payment. Please check your details and try again.
                  </p>
                )}

                <Button
                  className="w-full gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:from-amber-300 hover:to-orange-400"
                  disabled={checkoutMutation.isPending || phoneNumber.trim().length < 10}
                  onClick={() =>
                    checkoutMutation.mutate({
                      productId: selectedProduct.id,
                      phoneNumber: phoneNumber.trim(),
                      customerEmail: customerEmail.trim() || undefined,
                    })
                  }
                >
                  {checkoutMutation.isPending ? 'Initializing...' : 'Pay with Mobile Money'}
                </Button>

                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-full rounded-xl border border-white/15 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <p className="inline-flex w-full items-center justify-center gap-2 text-[11px] text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Secured by Paystack
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
