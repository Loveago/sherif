import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getOrderStats, isOrderProcessingHalted } from "@/lib/orders";
import { formatGHS, formatDateTime } from "@/lib/types";
import { orderCode } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { DashboardAutoRefresh } from "@/components/admin/dashboard-auto-refresh";
import {
  Users,
  Layers,
  CheckCircle2,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Smartphone,
  Ticket,
  Clock,
  ArrowDownLeft,
  ShieldCheck,
  Banknote,
  Activity,
  PlusCircle,
  FileSpreadsheet,
  Server,
  Megaphone,
  ArrowUpRight,
  ChevronRight,
  Radio,
  Zap,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    stats,
    userCount,
    resellerAgg,
    activeUsers,
    recent,
    halted,
    incomingTodayAgg,
    unclaimedAgg,
    claimedTodayAgg,
    claimsTodayCount,
    activeSignupCodesCount,
    codeRegistrationsCount,
    acceptedMtnCount,
    pendingMtnCount,
    processingMtnCount,
    rejectedMtnCount,
    blockedMtnCount,
    pendingWithdrawalsCount,
    pendingDisputesCount,
    providerMtnSetting,
    providerTelecelSetting,
    providerAtSetting,
  ] = await Promise.all([
    getOrderStats({}),
    prisma.user.count(),
    prisma.user.aggregate({ where: { role: { in: ["RESELLER", "AGENT", "USER"] } }, _sum: { balance: true } }),
    prisma.user.count({ where: { lastLoginAt: { gte: since } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, email: true } } },
    }),
    isOrderProcessingHalted(),
    // INCOMING MOMO TODAY
    prisma.incomingMomoTransaction.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // UNCLAIMED MOMO
    prisma.incomingMomoTransaction.aggregate({
      where: { status: "AVAILABLE" },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // CLAIMED TODAY
    prisma.incomingMomoTransaction.aggregate({
      where: { status: "CLAIMED", updatedAt: { gte: startOfDay } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // CLAIMS TODAY
    prisma.sendClaim.count({
      where: { createdAt: { gte: startOfDay } },
    }),
    // ACTIVE SIGNUP CODES
    prisma.signupCode.count({
      where: { status: "ACTIVE" },
    }),
    // CODE REGISTRATIONS
    prisma.signupCodeUsage.count(),
    // MTN NUMBER VERIFICATION
    prisma.acceptedMtnNumber.count(),
    prisma.mtnVerificationRequest.count({ where: { status: "SUBMITTED" } }),
    prisma.mtnVerificationRequest.count({ where: { status: "PROCESSING" } }),
    prisma.mtnVerificationRequest.count({ where: { status: "REJECTED" } }),
    prisma.blockedMtnNumber.count(),
    prisma.storefrontWithdrawal.count({ where: { status: "PENDING" } }),
    prisma.deliveryReport.count({ where: { status: "UNDER_REVIEW" } }),
    // PROVIDER ROUTING MODES
    prisma.systemSetting.findUnique({ where: { key: "provider_routing_mode_mtn" } }),
    prisma.systemSetting.findUnique({ where: { key: "provider_routing_mode_telecel" } }),
    prisma.systemSetting.findUnique({ where: { key: "provider_routing_mode_airteltigo" } }),
  ]);

  const totalActionItems = pendingWithdrawalsCount + pendingDisputesCount + pendingMtnCount;

  return (
    <div className="space-y-6">
      {/* Top Header Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#162740]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Platform Command Center
            </h1>
            <span className="rounded-full bg-[#00df82]/15 text-[#00df82] border border-[#00df82]/30 px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase">
              LIVE ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time telecom dispatch, financial settlements, provider routing &amp; platform health
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <DashboardAutoRefresh />
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-[#162740] px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-[#00df82]" />
            <span>Orders Desk</span>
          </Link>
          <Link
            href="/admin/notifications"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00df82] to-[#00b568] hover:from-[#00f58f] hover:to-[#00c873] px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-slate-950 shadow-md shadow-[#00df82]/20 transition-all active:scale-95"
          >
            <Megaphone className="h-3.5 w-3.5 text-slate-950" />
            <span>Broadcast</span>
          </Link>
        </div>
      </div>

      {/* Emergency Status Alert if halted */}
      {halted && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-medium text-rose-800 dark:text-rose-200 flex items-center justify-between shadow-lg shadow-rose-950/20">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
            <span>
              <strong className="text-rose-900 dark:text-white">Order processing is currently HALTED.</strong> All incoming order submissions are blocked platform-wide.
            </span>
          </div>
          <Link
            href="/admin/settings"
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 font-bold text-white hover:bg-rose-500 transition-colors"
          >
            Resume Processing →
          </Link>
        </div>
      )}

      {/* Urgent Attention Queue Banner */}
      {totalActionItems > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-[#16140e] p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Operational Attention Needed ({totalActionItems} Pending Items)</span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-500/80 font-mono">Immediate Review</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pendingWithdrawalsCount > 0 && (
              <Link
                href="/admin/storefronts/withdrawals"
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:border-amber-400 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Banknote className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{pendingWithdrawalsCount} Payout Requests</div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-300">Storefront MoMo transfers</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-amber-500" />
              </Link>
            )}

            {pendingDisputesCount > 0 && (
              <Link
                href="/admin/delivery-reports"
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:border-rose-400 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{pendingDisputesCount} Open Disputes</div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-300">&quot;Not Received&quot; reports</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-rose-500" />
              </Link>
            )}

            {pendingMtnCount > 0 && (
              <Link
                href="/admin/mtn-verification"
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{pendingMtnCount} MTN Submissions</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-300">Awaiting verification batch</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-blue-500" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Row 1: High-Density Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders Volume */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-3.5 sm:p-4 space-y-2 hover:border-[#00df82]/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Orders Volume</span>
            <span className="p-1.5 rounded-lg bg-[#00df82]/10 text-[#00df82]">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {stats.total.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-emerald-500 font-semibold">{stats.success} completed</span>
            <span>·</span>
            <span className="text-amber-500 font-semibold">{stats.pending} in queue</span>
          </div>
        </div>

        {/* Reseller Float / Wallet Balances */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-3.5 sm:p-4 space-y-2 hover:border-[#00df82]/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Reseller Float Balance</span>
            <span className="p-1.5 rounded-lg bg-[#00df82]/10 text-[#00df82]">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#00df82] font-mono break-all">
            {formatGHS(resellerAgg._sum.balance ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Active wallet liability held by users
          </div>
        </div>

        {/* MoMo Received Today */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-3.5 sm:p-4 space-y-2 hover:border-[#00df82]/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Incoming MoMo Today</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Smartphone className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono break-all">
            {formatGHS(incomingTodayAgg._sum.amount ?? 0)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{incomingTodayAgg._count.id} deposits</span>
            <span className="text-amber-500 font-mono">{formatGHS(unclaimedAgg._sum.amount ?? 0)} unclaimed</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-3.5 sm:p-4 space-y-2 hover:border-[#00df82]/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Active Resellers</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {userCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {activeUsers} active in past 7 days
          </div>
        </div>
      </div>

      {/* Row 2: Telecom Carrier Dispatch Hub */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#00df82]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Telecom Carrier Gateways &amp; Dispatch Routing
            </h2>
          </div>
          <Link
            href="/admin/settings"
            className="text-xs font-semibold text-[#00df82] hover:underline"
          >
            Configure Gateway Routes →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MTN Ghana */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="font-bold text-slate-900 dark:text-white text-xs">MTN GHANA</span>
              </div>
              <span className="rounded bg-amber-500/20 text-amber-500 dark:text-amber-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                {providerMtnSetting?.value || "DIRECT_API"}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Whitelist Active:</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold">{acceptedMtnCount} Numbers</span>
              </div>
              <div className="flex justify-between">
                <span>Pending Verification:</span>
                <span className="text-amber-500 font-mono font-bold">{pendingMtnCount}</span>
              </div>
            </div>
            <Link
              href="/admin/mtn-verification"
              className="block text-center rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Verification Workbench →
            </Link>
          </div>

          {/* Telecel Ghana */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="font-bold text-slate-900 dark:text-white text-xs">TELECEL GHANA</span>
              </div>
              <span className="rounded bg-rose-500/20 text-rose-500 dark:text-rose-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                {providerTelecelSetting?.value || "PROVIDER_API"}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Dispatch Mode:</span>
                <span className="text-emerald-500 font-bold">Instant Automated</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-500 font-bold">Online</span>
              </div>
            </div>
            <Link
              href="/admin/order-api-logs"
              className="block text-center rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Provider API Logs →
            </Link>
          </div>

          {/* AirtelTigo */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="font-bold text-slate-900 dark:text-white text-xs">AIRTELTIGO (AT)</span>
              </div>
              <span className="rounded bg-blue-500/20 text-blue-500 dark:text-blue-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                {providerAtSetting?.value || "PROVIDER_API"}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>BigTime &amp; Regular:</span>
                <span className="text-emerald-500 font-bold">Active</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-500 font-bold">Online</span>
              </div>
            </div>
            <Link
              href="/admin/exports"
              className="block text-center rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Data Exports Desk →
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Live Order Feed */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#00df82]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Live Order Stream (All Resellers)
            </h2>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-[#00df82] hover:underline"
          >
            Manage All Orders →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-x-auto">
          {recent.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between gap-3 py-3 px-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-xl transition-colors"
            >
              <div className="min-w-0 flex-1 flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    o.network === "MTN"
                      ? "bg-amber-400"
                      : o.network === "TELECEL"
                      ? "bg-rose-500"
                      : "bg-blue-500"
                  }`}
                />
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {o.phoneNumber} · {o.gbAmount}GB {o.network}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {orderCode(o.id)} · {o.user.name} ({o.user.email}) · {formatDateTime(o.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold font-mono text-slate-900 dark:text-white">{formatGHS(o.amount)}</span>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}

          {recent.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">No recent orders found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
