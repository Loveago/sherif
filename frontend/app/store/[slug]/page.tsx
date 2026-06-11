'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { apiRequest } from '@/lib/api';
import type { Product, Storefront } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type StorefrontResponse = { storefront: Storefront; products: Product[] };

export default function PublicStorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { data, isLoading } = useQuery({
    queryKey: ['public-storefront', slug],
    queryFn: () => apiRequest<StorefrontResponse>(`/store/${slug}`),
    enabled: Boolean(slug),
  });

  if (isLoading || !data) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-400">Loading storefront...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400">
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <GlassCard className="p-8">
          <div className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-violet-300">Public Storefront</div>
          <h1 className="mt-4 text-4xl font-semibold text-white">{data.storefront.displayName}</h1>
          <p className="mt-3 text-lg text-slate-300">{data.storefront.tagline}</p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400">{data.storefront.description}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">Visits</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.storefront.visits}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">Sales</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.storefront.sales}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">Conversion</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.storefront.conversionRate}%</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-8">
          <p className="text-sm text-slate-400">Contact Information</p>
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-violet-300" />{data.storefront.contactEmail || 'No email set'}</div>
            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-violet-300" />{data.storefront.contactPhone || 'No phone set'}</div>
          </div>
          <div className="mt-8 rounded-3xl border border-violet-500/20 bg-violet-500/10 p-5">
            <p className="text-sm text-violet-200">Want to launch your own storefront?</p>
            <Link href="/register"><Button className="mt-4 w-full">Create Agent Account</Button></Link>
          </div>
        </GlassCard>
      </div>

      <section className="mt-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Available Bundles</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Dynamic product catalog</h2>
          </div>
          <Link href="/login"><Button variant="secondary" className="gap-2"><ShoppingCart className="h-4 w-4" />Buy via dashboard</Button></Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.products.map((product) => (
            <GlassCard key={product.id} className="p-5">
              <p className="text-sm text-slate-400">{product.network.name}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{product.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{product.description}</p>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Price</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(product.sellingPrice)}</p>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-300">{product.name} {product.description}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
