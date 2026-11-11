import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatCard } from "@/components/shared";
import { ProfileForms } from "./profile-form";
import { formatGHS, canAccessDeveloperApi } from "@/lib/types";
import { getEffectivePricingProfileForUser } from "@/lib/orders";
import {
  ArrowDownLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Fingerprint,
  Phone,
  Tag,
  Ticket,
  Wallet,
  XCircle,
  ShieldCheck,
  Package,
} from "lucide-react";

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) return null; // guarded by middleware

  const user = await prisma.user.findUnique({
    where: { id: current.id },
    select: {
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      balance: true,
      createdAt: true,
      pricingProfileId: true,
      referredById: true,
      signupCodeUsage: {
        select: {
          signupCode: { select: { code: true } },
        },
      },
    },
  });
  if (!user) return null;

  const effectiveProfile = await getEffectivePricingProfileForUser({
    id: current.id,
    role: user.role,
    pricingProfileId: user.pricingProfileId,
  });
  const profileName = effectiveProfile?.name ?? "Standard";

  const statusGroups = await prisma.order.groupBy({
    by: ["status"],
    where: { userId: current.id },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const countOf = (s: string) => statusGroups.find((g) => g.status === s)?._count._all ?? 0;
  const totalOrders = statusGroups.reduce((n, g) => n + g._count._all, 0);
  const totalSpend = statusGroups.reduce((n, g) => n + (g._sum.amount ?? 0), 0);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1322]/90">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Account &amp; Security Center
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Profile &amp; Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your personal credentials, authentication security, and view account tier status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Verified User
            </span>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Orders" value={totalOrders.toLocaleString()} icon={ClipboardList} />
        <StatCard title="Successful" value={countOf("SUCCESS").toLocaleString()} icon={CheckCircle2} />
        <StatCard title="Failed" value={countOf("FAILED").toLocaleString()} icon={XCircle} />
        <StatCard title="Total Spend" value={formatGHS(totalSpend)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Identity card + quick links */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1322]/90">
            {/* Banner Header with Emerald Gradient */}
            <div className="h-24 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700" />
            <div className="-mt-10 px-6 pb-6">
              <div className="flex items-end justify-between">
                <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-black text-white shadow-xl dark:border-[#0b1322]">
                  {initials}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {user.status.toLowerCase()}
                </span>
              </div>

              <h2 className="mt-4 truncate text-xl font-black text-slate-900 dark:text-white">{user.name}</h2>
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{user.email}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200/80 bg-slate-100 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  {user.role}
                </span>
                <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  Tier: {profileName}
                </span>
              </div>

              <dl className="mt-6 space-y-3.5 border-t border-slate-100 pt-5 text-xs dark:border-white/5">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400">
                    <Fingerprint className="h-3.5 w-3.5 text-emerald-500" /> User ID
                  </dt>
                  <dd className="max-w-[140px] truncate font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300" title={current.id}>
                    {current.id}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" /> Phone
                  </dt>
                  <dd className="truncate font-mono font-bold text-slate-900 dark:text-white">
                    {user.phone || "Not set"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400">
                    <Tag className="h-3.5 w-3.5 text-emerald-500" /> Pricing profile
                  </dt>
                  <dd className="truncate font-bold text-slate-900 dark:text-white">{profileName}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400">
                    <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Wallet Balance
                  </dt>
                  <dd className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatGHS(user.balance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5 text-emerald-500" /> Member since
                  </dt>
                  <dd className="font-medium text-slate-700 dark:text-slate-300">{memberSince}</dd>
                </div>
                {user.signupCodeUsage?.signupCode?.code && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400">
                      <Ticket className="h-3.5 w-3.5 text-emerald-500" /> Signup code
                    </dt>
                    <dd className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                      {user.signupCodeUsage.signupCode.code}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/billing"
              className="group rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#0b1322]/90 dark:hover:border-emerald-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-black text-slate-900 dark:text-white">Top up wallet</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Instant deposit funds</p>
            </Link>
            {canAccessDeveloperApi(user.role, user.referredById) ? (
              <Link
                href="/dashboard/api-docs"
                className="group rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#0b1322]/90 dark:hover:border-emerald-500/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-black text-slate-900 dark:text-white">API Reference</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Integrate &amp; automate</p>
              </Link>
            ) : (
              <Link
                href="/dashboard/packages"
                className="group rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#0b1322]/90 dark:hover:border-emerald-500/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                  <Package className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-black text-slate-900 dark:text-white">Data Packages</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Wholesale bundle rates</p>
              </Link>
            )}
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="lg:col-span-2">
          <ProfileForms initial={{ name: user.name, email: user.email, phone: user.phone ?? "" }} />
        </div>
      </div>
    </div>
  );
}
