import Link from 'next/link';
import {
  ArrowRight, Zap, Wallet, CreditCard, Store, ShieldCheck, BarChart3,
  Globe, Star, Headphones, Clock, User, CheckCircle2, Sparkles,
  ChevronRight, TrendingUp, Phone, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { LandingHeader } from '@/components/landing-header';

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
  { name: 'MTN', color: 'bg-yellow-500', textColor: 'text-yellow-400', label: 'MTN', iconColor: '#facc15' },
  { name: 'Telecel', color: 'bg-rose-500', textColor: 'text-rose-400', label: 'telecel', iconColor: '#f43f5e' },
  { name: 'AirtelTigo', color: 'bg-sky-500', textColor: 'text-sky-400', label: 'AT airteltigo', iconColor: '#38bdf8' },
];

const trustBadges = [
  { icon: Zap, label: 'Instant Delivery', sub: 'Data in seconds' },
  { icon: ShieldCheck, label: 'Secure & Reliable', sub: '100% safe transactions' },
  { icon: Headphones, label: '24/7 Support', sub: "We're here for you" },
];

const testimonials = [
  { name: 'Kwame A.', role: 'Agent, Accra' },
  { name: 'Ama D.', role: 'Reseller, Kumasi' },
  { name: 'Kofi M.', role: 'Vendor, Tamale' },
  { name: 'Abena S.', role: 'Agent, Sunyani' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060a14] bg-mesh overflow-x-hidden">
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Column */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-600/10 px-4 py-1.5 text-xs font-semibold text-violet-300 backdrop-blur-sm">
                <Star className="h-3.5 w-3.5 fill-violet-400 text-violet-400" />
                #1 Data Marketplace in Ghana
              </div>
              <h1 className="mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[4.2rem]">
                Instant Data.
                <br />
                Any Network.
                <br />
                <span className="relative inline-block text-violet-400">
                  Anytime.
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                    <path d="M2 8c40-6 80-6 120 0s70 4 76-2" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-400">
                Fund your wallet and enjoy instant data delivery across all major networks in Ghana.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="w-full gap-2 shadow-xl shadow-violet-600/30 sm:w-auto">
                    Get Started <Zap className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto">
                    Create Account <User className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Mobile Network Visual */}
              <div className="mt-10 flex items-center justify-center gap-4 lg:hidden">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 glow-yellow animate-pulse-glow">
                  <span className="text-[10px] font-black tracking-wider text-black">MTN</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 glow-red animate-pulse-glow-delayed">
                  <span className="text-lg font-black text-white">t</span>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 glow-blue animate-pulse-glow-delayed-2">
                  <span className="text-lg font-black text-white">AT</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {trustBadges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div key={badge.label} className="flex flex-1 items-center gap-2.5 rounded-xl border border-gray-700/50 bg-[#0b1120]/80 px-4 py-3 backdrop-blur-sm sm:flex-initial">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/15 text-violet-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-white">{badge.label}</p>
                        <p className="text-[10px] text-gray-500">{badge.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Ghana Map + Phone */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto h-[500px] w-[480px]">
                {/* Ghana map outline */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 260" className="h-[420px] w-auto opacity-90" fill="none">
                    {/* Outer glow */}
                    <defs>
                      <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                      </radialGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <ellipse cx="100" cy="130" rx="110" ry="145" fill="url(#mapGlow)" className="animate-pulse-glow" />
                    {/* Map outline */}
                    <path
                      d="M60 20 C80 15 120 10 140 25 C155 35 170 50 175 70 C180 95 178 120 175 140 C172 170 168 200 160 220 C150 240 130 250 100 255 C70 250 50 240 40 220 C32 200 28 170 25 140 C22 120 20 95 25 70 C30 50 45 35 60 20Z"
                      fill="none"
                      stroke="rgba(139,92,246,0.5)"
                      strokeWidth="1.5"
                      filter="url(#glow)"
                    />
                    {/* Internal grid dots */}
                    {[...Array(12)].map((_, i) => (
                      [...Array(10)].map((_, j) => (
                        <circle
                          key={`${i}-${j}`}
                          cx={40 + i * 12}
                          cy={40 + j * 18}
                          r="0.8"
                          fill="rgba(139,92,246,0.25)"
                        />
                      ))
                    ))}
                  </svg>
                </div>

                {/* MTN Orb - top right */}
                <div className="absolute right-4 top-8 animate-float">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-xl" />
                    <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-yellow-500 glow-yellow animate-pulse-glow">
                      <span className="text-[11px] font-black tracking-wider text-black">MTN</span>
                    </div>
                    {/* Connection line to phone */}
                    <svg className="absolute top-1/2 -left-16 h-2 w-16" viewBox="0 0 64 4">
                      <path d="M64 2C40 2 20 2 0 2" stroke="#facc15" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
                    </svg>
                  </div>
                </div>

                {/* Telecel Orb - far right */}
                <div className="absolute right-0 top-[38%] animate-float-delayed">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 glow-red animate-pulse-glow-delayed">
                      <div className="text-center leading-none">
                        <span className="block text-lg font-black text-white">t</span>
                        <span className="block text-[8px] font-bold text-white/90">telecel</span>
                      </div>
                    </div>
                    <svg className="absolute -left-12 top-1/2 h-2 w-12" viewBox="0 0 48 4">
                      <path d="M48 2C30 2 15 2 0 2" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
                    </svg>
                  </div>
                </div>

                {/* AirtelTigo Orb - bottom left */}
                <div className="absolute bottom-24 left-8 animate-float-delayed-2">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-xl" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-sky-500 glow-blue animate-pulse-glow-delayed-2">
                      <div className="text-center leading-none">
                        <span className="block text-2xl font-black text-white">AT</span>
                        <span className="block text-[7px] font-bold text-white/90">airtel tigo</span>
                      </div>
                    </div>
                    <svg className="absolute -right-16 top-1/2 h-2 w-16" viewBox="0 0 64 4">
                      <path d="M0 2C20 2 40 2 64 2" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
                    </svg>
                  </div>
                </div>

                {/* Phone Mockup - center */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative w-[200px] rounded-[2rem] border-[3px] border-gray-700/80 bg-gray-900 p-2 shadow-2xl shadow-black/40">
                    {/* Notch */}
                    <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-gray-800" />
                    <div className="rounded-[1.5rem] bg-[#0a0f1e] p-4 pt-5">
                      {/* Status */}
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-widest text-white">CheapDataPacks</span>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                      </div>
                      {/* Balance */}
                      <div className="mb-4">
                        <p className="text-[10px] text-gray-500">Wallet Balance</p>
                        <p className="text-xl font-bold text-white">GHS 83.90</p>
                      </div>
                      {/* Fund Button */}
                      <button className="mb-5 w-full rounded-xl bg-violet-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/30">
                        + Fund Wallet
                      </button>
                      {/* Menu Items */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between rounded-xl bg-[#111827] px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                              <Phone className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-white">Airtime & Data</p>
                              <p className="text-[9px] text-gray-500">All Networks</p>
                            </div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-[#111827] px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600/20 text-sky-400">
                              <Zap className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-white">Auto Delivery</p>
                              <p className="text-[9px] text-gray-500">Instant & Secure</p>
                            </div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-[#111827] px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400">
                              <TrendingUp className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-white">Transaction History</p>
                              <p className="text-[9px] text-gray-500">Track all activities</p>
                            </div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex flex-col items-center gap-3 sm:mt-16 sm:flex-row sm:justify-start">
            <div className="flex -space-x-2">
              {testimonials.map((t, i) => (
                <div
                  key={t.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#060a14] bg-gradient-to-br from-violet-500 to-violet-700 text-[10px] font-bold text-white"
                  style={{ zIndex: 4 - i }}
                >
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm font-semibold text-white">4.8/5</span>
              <span className="text-sm text-gray-500">from 2,500+ users</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-gray-800/60 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-600/10 px-4 py-1.5 text-xs font-semibold text-violet-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Platform Features
            </div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-5xl">
              Built for growth and automation
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              The experience is dark-mode-first, wallet-led and built to handle thousands of daily transactions.
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <GlassCard
                  key={feature.title}
                  className="group relative overflow-hidden p-7 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-600/5 blur-2xl transition-all group-hover:bg-violet-600/10" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/15 text-violet-400 transition-all group-hover:bg-violet-600/25 group-hover:shadow-lg group-hover:shadow-violet-600/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{feature.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Networks Section */}
      <section id="networks" className="border-t border-gray-800/60 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-600/10 px-4 py-1.5 text-xs font-semibold text-violet-300 backdrop-blur-sm">
              <Globe className="h-3.5 w-3.5" />
              Supported Networks
            </div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-5xl">
              All major Ghanaian networks
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {networks.map((network) => (
              <GlassCard
                key={network.name}
                className="group relative overflow-hidden p-8 text-center transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                  style={{ background: `radial-gradient(circle at 50% 0%, ${network.iconColor}10 0%, transparent 70%)` }}
                />
                <div className="relative mx-auto">
                  <div className="absolute inset-0 rounded-full blur-xl" style={{ background: `${network.iconColor}30` }} />
                  <div className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full ${network.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                    style={{ boxShadow: `0 0 40px -10px ${network.iconColor}60` }}
                  >
                    {network.name === 'MTN' && <span className="text-sm font-black tracking-wider text-black">MTN</span>}
                    {network.name === 'Telecel' && (
                      <div className="text-center leading-none">
                        <span className="block text-xl font-black text-white">t</span>
                        <span className="block text-[9px] font-bold text-white/90">telecel</span>
                      </div>
                    )}
                    {network.name === 'AirtelTigo' && (
                      <div className="text-center leading-none">
                        <span className="block text-xl font-black text-white">AT</span>
                        <span className="block text-[8px] font-bold text-white/90">airtel tigo</span>
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="relative mt-6 text-xl font-bold text-white">{network.name}</h3>
                <p className="relative mt-2 text-sm text-gray-400">Dynamic products, pricing control, wallet purchases.</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-t border-gray-800/60 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {stats.map((stat) => (
              <GlassCard key={stat.label} className="p-4 text-center transition-all duration-300 hover:-translate-y-1 md:p-6">
                <p className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">{stat.value}</p>
                <div className="mx-auto mt-2 h-px w-8 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                <p className="mt-2 text-sm text-gray-400">{stat.label}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="relative overflow-hidden border-t border-gray-800/60 py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 text-center md:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-600/10 px-4 py-1.5 text-xs font-semibold text-violet-300 backdrop-blur-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            Ready to get started?
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            Launch your premium data<br className="hidden sm:inline" /> operation today
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-gray-400">
            Join thousands of agents earning commissions through our platform. Instant setup, zero hassle.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="w-full gap-2 shadow-xl shadow-violet-600/30 sm:w-auto">
                Start Building <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                Sign In <Sparkles className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 bg-[#050812] py-8 md:py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row md:gap-6 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-800">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white">CheapDataPacks</p>
              <p className="text-[9px] text-gray-600">Ghana</p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600">
            © 2026 CheapDataPacks Ghana. Premium enterprise data distribution platform.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/login" className="transition-colors hover:text-violet-300">Sign In</Link>
            <Link href="/register" className="transition-colors hover:text-violet-300">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
