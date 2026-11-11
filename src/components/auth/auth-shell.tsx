import Link from "next/link";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import {
  Zap,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  TrendingUp,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative min-h-screen bg-[#070c14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/15 to-transparent blur-3xl opacity-80" />
        <div className="absolute bottom-0 right-0 w-[550px] h-[550px] bg-gradient-to-tl from-cyan-600/20 via-indigo-900/15 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 blur-3xl rounded-full" />
      </div>

      {/* Top subtle bar for mobile/desktop */}
      <div className="relative z-10 border-b border-white/[0.06] bg-slate-950/40 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/store" className="flex items-center gap-2 group transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <BrandLogo size="sm" variant="dark" showTagline={true} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              API Gateway 99.99% Live
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-12">
          {/* Left Brand Showcase Column (Visible on lg+) */}
          <div className="hidden lg:col-span-7 lg:flex flex-col justify-center space-y-8 pr-6">
            <div className="flex items-center">
              <Link href="/store" className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <BrandLogo size="lg" variant="dark" showTagline={true} />
              </Link>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 shadow-sm shadow-indigo-500/10">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Next-Gen Reseller Telecommunications Platform
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl leading-[1.12]">
                Instant Data Dispatch,{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                  Automated Multi-Carrier Engine.
                </span>
              </h1>
              <p className="max-w-xl text-base text-slate-400 leading-relaxed">
                Connect directly to high-throughput telecom switches in Ghana. Deliver non-expiry data packages, manage sub-accounts, and launch branded storefronts in seconds.
              </p>
            </div>

            {/* Feature Cards Showcase */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 hover:border-emerald-500/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-white">Sub-2s Direct Dispatch</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automated USSD telecom pipeline fulfills customer bundles without manual operator intervention.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 hover:border-emerald-500/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-white">Verified Multi-Wallet MoMo</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instant automated reconciliations for MTN Mobile Money, Telecel Cash, and AT Money.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 hover:border-emerald-500/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Layers className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-white">Turnkey Reseller Stores</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deploy your customized public storefront with your own margins, WhatsApp integration, and live tracking.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 hover:border-emerald-500/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Lock className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-white">Bank-Grade Security</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  256-bit encryption, role-based permissions, OTP session protection, and audit logs.
                </p>
              </div>
            </div>

            {/* Live Simulated Network Feed Ticker */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 text-xs text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-mono text-slate-400">Carrier Nodes:</span>
              <span className="font-semibold text-white">MTN 4G/5G Live</span>
              <span className="text-slate-600">·</span>
              <span className="font-semibold text-white">Telecel Live</span>
              <span className="text-slate-600">·</span>
              <span className="font-semibold text-white">AT Ghana Live</span>
            </div>
          </div>

          {/* Right Column: Sleek Elevated Form Container */}
          <div className="mx-auto w-full max-w-md lg:col-span-5 lg:mx-0">
            {/* Form Header Brand Badge */}
            <div className="mb-6 flex flex-col items-center text-center">
              <Link
                href="/store"
                className="group inline-flex items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-2.5 shadow-xl shadow-black/40 backdrop-blur-xl ring-1 ring-white/10 transition-all hover:border-emerald-400/40 hover:shadow-emerald-500/10 active:scale-[0.99]"
              >
                <BrandLogo size="md" variant="dark" showTagline={true} />
              </Link>
              <p className="mt-2 text-xs font-medium text-slate-400">
                Telecom &amp; Data Reseller Gateway
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl transition-all">
              {/* Card Ambient Glow Line */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/15 blur-2xl" />

              <div className="relative z-10">
                <div className="mb-6">
                  <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
                  {subtitle && (
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-400">{subtitle}</p>
                  )}
                </div>

                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-slate-950/40 px-6 py-4 text-center text-xs text-slate-400 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>CleanDataPacks © 2026 · All Rights Reserved</span>
            <span>·</span>
            <a
              href="https://wa.me/233507904981"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors group"
            >
              <span>Powered by</span>
              <span className="font-semibold text-white group-hover:text-emerald-400 group-hover:underline">
                CrazyTech Enterprise
              </span>
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-slate-400">
            <Link href="/terms" className="hover:text-emerald-400 transition-colors">
              Terms
            </Link>
            <span>·</span>
            <Link href="/refund-policy" className="hover:text-emerald-400 transition-colors">
              Refunds
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/store" className="hover:text-emerald-400 transition-colors">
              Storefront Directory
            </Link>
            <span>·</span>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Paystack Secured
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function AuthFooterLink({
  href,
  prompt,
  cta,
}: {
  href: string;
  prompt: string;
  cta: string;
}) {
  return (
    <p className="mt-6 text-center text-xs sm:text-sm text-slate-400 border-t border-white/10 pt-4">
      {prompt}{" "}
      <Link
        href={href}
        className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors underline-offset-4 hover:underline"
      >
        {cta}
      </Link>
    </p>
  );
}
