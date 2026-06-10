import Link from 'next/link';
import { ArrowRight, Zap, Wallet, CreditCard, Store, ShieldCheck, BarChart3, Globe, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';

const features = [
  { title: 'Instant Data Delivery', description: 'Automated fulfillment across MTN, Telecel and AirtelTigo.', icon: Zap },
  { title: 'Wallet Payments', description: 'Fund once, purchase seamlessly, track every balance movement.', icon: Wallet },
  { title: 'Bulk Orders', description: 'Upload CSV files, preview records, and process at scale.', icon: CreditCard },
  { title: 'Agent Storefronts', description: 'Public storefront with analytics and mobile-first design.', icon: Store },
  { title: 'Secure Transactions', description: 'JWT auth, audit logs, rate limiting and wallet-first accounting.', icon: ShieldCheck },
  { title: 'Analytics Dashboard', description: 'Premium charts, live KPIs, network usage and commissions.', icon: BarChart3 },
];

const stats = [
  { label: 'Total Orders', value: '1.2M+' },
  { label: 'Active Users', value: '250K+' },
  { label: 'Data Delivered', value: '50TB+' },
  { label: 'Transactions', value: '₵12.5M+' },
];

const networks = [
  { name: 'MTN', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  { name: 'Telecel', color: 'bg-rose-500', textColor: 'text-rose-400' },
  { name: 'AirtelTigo', color: 'bg-sky-500', textColor: 'text-sky-400' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060a14]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0b1120]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">DATAHUB</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Ghana</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-gray-400 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#networks" className="hover:text-white">Networks</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white">Sign In</Link>
            <Link href="/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-600/10 px-4 py-1.5 text-xs font-medium text-violet-400">
                <Globe className="h-3.5 w-3.5" />
                #1 Data Marketplace in Ghana
              </div>
              <h1 className="mt-6 text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
                Instant Data.
                <br />
                Any Network.
                <br />
                <span className="text-violet-400">Anytime.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-gray-400">
                Fund your wallet and enjoy instant data delivery across all major networks in Ghana.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register"><Button size="lg" className="gap-2">Get Started <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link href="/dashboard"><Button size="lg" variant="secondary">Create Account</Button></Link>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto w-80">
                {/* Network orbs */}
                <div className="absolute -left-8 top-1/4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30">
                  <span className="text-sm font-bold text-white">MTN</span>
                </div>
                <div className="absolute -right-4 top-1/3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-500/30">
                  <span className="text-xs font-bold text-white">T</span>
                </div>
                <div className="absolute bottom-1/4 left-1/4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 shadow-lg shadow-sky-500/30">
                  <span className="text-[10px] font-bold text-white">AT</span>
                </div>
                {/* Center phone mockup */}
                <div className="mx-auto w-48 rounded-3xl border-4 border-gray-700 bg-gray-900 p-2 shadow-2xl">
                  <div className="rounded-2xl bg-[#0f172a] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">DATAHUB</span>
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-3/4 rounded bg-gray-700" />
                      <div className="h-2 w-1/2 rounded bg-gray-700" />
                      <div className="mt-4 h-8 w-full rounded-lg bg-violet-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <GlassCard key={stat.label} className="p-5 text-center">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-400">{stat.label}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-violet-400">Platform Features</p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">Built for growth and automation</h2>
            <p className="mt-3 text-gray-400">The experience is dark-mode-first, wallet-led and built to handle thousands of daily transactions.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <GlassCard key={feature.title} className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{feature.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Networks Section */}
      <section id="networks" className="border-t border-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-violet-400">Supported Networks</p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">All major Ghanaian networks</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {networks.map((network) => (
              <GlassCard key={network.name} className="p-6 text-center">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${network.color}`}>
                  <span className="text-lg font-bold text-white">{network.name.slice(0, 2)}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{network.name}</h3>
                <p className="mt-2 text-sm text-gray-400">Dynamic products, pricing control, wallet purchases.</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="border-t border-gray-800 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Launch your premium data operation today</h2>
          <p className="mt-4 text-gray-400">Join thousands of agents earning commissions through our platform.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register"><Button size="lg" className="gap-2">Start Building <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <p className="text-sm text-gray-500">© 2026 DATAHUB Ghana. Premium enterprise data distribution platform.</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/login" className="hover:text-white">Sign In</Link>
            <Link href="/register" className="hover:text-white">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
