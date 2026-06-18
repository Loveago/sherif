'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ShoppingBag,
  Phone,
  Search,
  MessageCircle,
  Shield,
  Wifi,
  BarChart3,
  CheckCircle2,
  X,
  ChevronRight,
  CreditCard,
  Clock,
} from 'lucide-react';
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

const networkStyleByCode: Record<string, { bg: string; text: string; border: string; logoText: string }> = {
  MTN: { bg: 'bg-yellow-400', text: 'text-yellow-950', border: 'border-yellow-500', logoText: 'MTN' },
  TELECEL: { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-500', logoText: 't' },
  AIRTELTIGO: { bg: 'bg-sky-500', text: 'text-white', border: 'border-sky-500', logoText: 'AT' },
};

const getNetworkStyle = (code: string) =>
  networkStyleByCode[code] || { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-500', logoText: code[0] };

const validityDays = '90 DAYS';

export default function PublicStorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['public-storefront', slug],
    queryFn: () => apiRequest<StorefrontResponse>(`/store/${slug}`),
    enabled: Boolean(slug),
  });

  const networks = useMemo(() => {
    if (!data?.products) return ['ALL'];
    const unique = Array.from(new Set(data.products.map((product) => product.network.code)));
    return ['ALL', ...unique];
  }, [data?.products]);

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    if (selectedNetwork === 'ALL') return data.products;
    return data.products.filter((product) => product.network.code === selectedNetwork);
  }, [data?.products, selectedNetwork]);

  const checkoutMutation = useMutation({
    mutationFn: (payload: { productId: string; phoneNumber: string }) =>
      apiRequest<InitializeStorefrontPaymentResponse>(`/store/${slug}/paystack/initialize`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (result) => {
      window.location.href = result.authorization_url;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8fafc] text-sm text-slate-600">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 animate-spin text-blue-600" />
          Loading storefront...
        </div>
      </div>
    );
  }

  const { storefront } = data;
  const brandName = storefront.displayName || 'LOFAQ Data Hub';
  const brandTagline = storefront.tagline || 'Affordable data bundles · AFA registration · Result checker vouchers';

  return (
    <div className="relative min-h-screen bg-[#f8fafc]">
      {/* Decorative header background */}
      <div className="absolute left-0 right-0 top-0 h-96 bg-gradient-to-br from-blue-600 to-blue-800" />
      <div className="absolute left-0 right-0 top-0 h-96 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_40%)]" />

      {/* Header */}
      <header className="relative mx-auto max-w-7xl px-4 pt-6 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
              <ShoppingBag className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">{brandName}</h1>
              <p className="text-sm text-blue-100 md:text-base">{brandTagline}</p>
            </div>
          </div>

          {storefront.contactPhone && (
            <a
              href={`tel:${storefront.contactPhone}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold text-white shadow-md backdrop-blur-sm transition hover:bg-white/30 md:justify-start"
            >
              <Phone className="h-4 w-4" /> {storefront.contactPhone}
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="mx-auto mt-6 flex max-w-md rounded-full bg-slate-900/60 p-1.5 backdrop-blur-md">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-blue-700 shadow-sm">
            <BarChart3 className="h-4 w-4" /> DATA
          </button>
          <Link
            href={`/store/${slug}/track`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            <Search className="h-4 w-4" /> TRACK
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="relative mx-auto -mt-8 max-w-7xl px-4 pb-16 pt-4 md:px-6">
        {/* Choose network */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg md:p-6">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-500">CHOOSE NETWORK</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {networks.map((network) => {
              const style = getNetworkStyle(network);
              const isAll = network === 'ALL';
              const isActive = selectedNetwork === network;
              return (
                <button
                  key={network}
                  onClick={() => setSelectedNetwork(network)}
                  className={`flex shrink-0 flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? 'border-blue-600 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 ${style.border} ${style.bg} ${style.text}`}
                  >
                    {isAll ? 'ALL' : style.logoText}
                  </div>
                  <span className={`text-xs font-semibold ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                    {isAll ? 'All Networks' : network}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Products grid */}
        <section className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, index) => {
              const style = getNetworkStyle(product.network.code);
              return (
                <motion.article
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ delay: index * 0.04 }}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition hover:shadow-lg"
                >
                  {/* Card top with network branding */}
                  <div className={`${style.bg} px-5 py-4 text-center`}>
                    <div className="mx-auto flex h-12 w-20 items-center justify-center rounded-full border-2 border-black/30 bg-white/90">
                      <span className={`text-sm font-black ${style.text === 'text-white' ? 'text-slate-900' : style.text}`}>
                        {style.logoText}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 text-center">
                    <p className="text-2xl font-black text-slate-900">{product.dataSize}</p>
                    <p className="text-xs font-medium text-slate-500">{validityDays}</p>
                    <p className="mt-2 text-lg font-bold text-emerald-600">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                    <Button
                      className="mt-4 w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setSelectedProduct(product);
                        setPhoneNumber('');
                      }}
                    >
                      <ShoppingBag className="h-4 w-4" /> Buy Now
                    </Button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {filteredProducts.length === 0 && (
            <div className="col-span-2 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 md:col-span-3 lg:col-span-4 xl:col-span-5">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm font-medium">No products available for this network</p>
            </div>
          )}
        </section>

        {/* Trust strip */}
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Secure Payment</p>
              <p className="text-xs text-slate-500">Paystack protected</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Instant Delivery</p>
              <p className="text-xs text-slate-500">Auto-processed orders</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Mobile Money</p>
              <p className="text-xs text-slate-500">MTN, Telecel & AT</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="font-semibold text-slate-900">{brandName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-4 w-4 text-emerald-500" /> Secured</span>
            <span className="inline-flex items-center gap-1.5"><Wifi className="h-4 w-4 text-blue-500" /> Instant delivery</span>
          </div>
        </div>
      </footer>

      {/* Checkout modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-blue-100">Complete Your Order</p>
                    <p className="mt-1 text-xl font-bold text-white">
                      {selectedProduct.network.name} · {selectedProduct.dataSize}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="rounded-lg bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Amount to pay</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedProduct.sellingPrice)}</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Data Bundle Number</label>
                  <input
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="0551234567"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {checkoutMutation.isError && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {checkoutMutation.error instanceof Error
                      ? checkoutMutation.error.message
                      : 'Unable to start payment. Please check your details and try again.'}
                  </p>
                )}

                <Button
                  className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
                  disabled={checkoutMutation.isPending || phoneNumber.trim().length < 10}
                  onClick={() =>
                    checkoutMutation.mutate({
                      productId: selectedProduct.id,
                      phoneNumber: phoneNumber.trim(),
                    })
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                  {checkoutMutation.isPending ? 'Initializing...' : 'Pay with Mobile Money'}
                </Button>

                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <p className="inline-flex w-full items-center justify-center gap-2 text-[11px] text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Secured by Paystack
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp float */}
      {storefront.whatsappUrl && (
        <a
          href={storefront.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:scale-110 hover:bg-emerald-400"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}
