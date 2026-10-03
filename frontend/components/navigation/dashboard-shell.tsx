'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CreditCard,
  Gauge,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Package,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Wallet,
  ChevronDown,
  User,
  Link2,
  AlertCircle,
  FileText,
  Menu,
  X,
  ClipboardList,
  RefreshCw,
  XCircle,
  Smartphone,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { WhatsAppBubble } from '@/components/whatsapp-bubble';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { PoweredBy } from '@/components/ui/powered-by';
import { apiRequest } from '@/lib/api';
import type { Wallet as WalletType } from '@/lib/types';

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: boolean;
}

interface NavSection {
  title: string;
  links: NavLink[];
}

const agentSections: NavSection[] = [
  {
    title: 'Core Services',
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
      { href: '/buy-data', label: 'Buy Data Bundles', icon: ShoppingBag },
      { href: '/cart', label: 'Cart Checkout', icon: ShoppingCart, badge: true },
      { href: '/bulk-orders', label: 'Bulk Orders', icon: CreditCard },
    ],
  },
  {
    title: 'Wallet & Clearing',
    links: [
      { href: '/wallet', label: 'Wallet (Send & Claim)', icon: Wallet },
      { href: '/orders-tracking', label: 'Track Orders', icon: Package },
      { href: '/commissions', label: 'Ledger & Comm.', icon: Gauge },
      { href: '/failed-payments', label: 'Failed Payments', icon: AlertCircle },
    ],
  },
  {
    title: 'Storefront & Growth',
    links: [
      { href: '/storefront', label: 'Storefront', icon: Store },
      { href: '/storefront-analytics', label: 'Analytics', icon: Gauge },
      { href: '/afa-registration', label: 'AFA Registration', icon: FileText },
      { href: '/referrals', label: 'Referrals', icon: Link2 },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/complaints', label: 'Complaints', icon: LifeBuoy },
      { href: '/notifications', label: 'Support & Alerts', icon: Bell },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    title: 'Operations',
    links: [
      { href: '/admin', label: 'Admin Dashboard', icon: Gauge },
      { href: '/admin/claims', label: 'Send & Claim MoMo', icon: Smartphone },
      { href: '/admin/orders', label: 'Orders Feed', icon: Package },
      { href: '/admin/products', label: 'Data Bundles', icon: ShoppingBag },
      { href: '/admin/reconciler', label: 'Payment Reconciler', icon: RefreshCw },
      { href: '/admin/failed-orders', label: 'Failed Orders', icon: XCircle },
    ],
  },
  {
    title: 'Users & Agents',
    links: [
      { href: '/admin/user-management', label: 'Users & Agents', icon: LayoutGrid },
      { href: '/admin/commissions', label: 'Commissions', icon: CreditCard },
      { href: '/admin/referral-codes', label: 'Referral Codes', icon: ClipboardList },
      { href: '/admin/afa-registrations', label: 'AFA Registrations', icon: ClipboardList },
    ],
  },
  {
    title: 'System & Finance',
    links: [
      { href: '/admin/withdrawals', label: 'Withdrawals', icon: Wallet },
      { href: '/admin/settings', label: 'System Settings', icon: Settings },
      { href: '/admin/reports', label: 'Financial Reports', icon: Gauge },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: Bell },
      { href: '/admin/operations', label: 'Live Operations', icon: LifeBuoy },
    ],
  },
];

function NavItem({
  link,
  isActive,
  cartItems,
  onClick,
}: {
  link: NavLink;
  isActive: boolean;
  cartItems: number;
  onClick?: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200',
        isActive
          ? 'bg-gradient-to-r from-violet-600/25 via-indigo-600/15 to-transparent text-white border-l-2 border-violet-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300',
        )}
      />
      <span className="truncate">{link.label}</span>
      {'badge' in link && link.badge && cartItems > 0 && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-black text-white shadow-sm shadow-violet-600/40">
          {cartItems}
        </span>
      )}
    </Link>
  );
}

export function DashboardShell({
  title,
  description,
  children,
  mode = 'agent',
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  mode?: 'agent' | 'admin';
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const sections = mode === 'admin' ? adminSections : agentSections;
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const cartItems = useCartStore((state) => state.getItemCount());

  // Live balance query for agent topbar chip
  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => apiRequest<WalletType>('/wallet'),
    enabled: mode === 'agent',
    staleTime: 30000,
  });

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const initials = user?.firstName?.[0]?.toUpperCase() || 'U';

  return (
    <div className="flex min-h-screen relative bg-[#080c15] text-slate-100 antialiased selection:bg-violet-600 selection:text-white">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-64 right-0 h-96 bg-gradient-to-b from-violet-600/[0.05] via-transparent to-transparent pointer-events-none" />
      <div className="fixed bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/[0.03] blur-3xl pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-[#0b101d]/90 backdrop-blur-2xl lg:flex z-30">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.05]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 shadow-md shadow-violet-600/30 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
              <path
                d="M2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-extrabold tracking-tight text-white">CheapDataPacks</p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ghana &middot; {mode === 'admin' ? 'Control' : 'Portal'}
            </p>
          </div>
        </div>

        {/* User Card with Balance Glance */}
        <div className="mx-3 mt-3 mb-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 font-bold text-xs text-white shadow-sm">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b101d] bg-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {mode === 'admin' ? 'Administrator' : 'Verified Agent'}
              </p>
            </div>
          </div>

          {mode === 'agent' && (
            <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Balance:</span>
              <span className="font-mono font-bold text-emerald-300">
                {formatCurrency(Number(wallet?.availableBalance ?? 0))}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              {section.links.map((link) => (
                <NavItem
                  key={link.href}
                  link={link}
                  isActive={pathname === link.href}
                  cartItems={cartItems}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Admin/User Logout in Sidebar */}
        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed left-0 top-0 z-50 h-full w-[280px] flex-col border-r border-white/[0.08] bg-[#0b101d] lg:hidden flex"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-md">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                      <path
                        d="M2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">CheapDataPacks</p>
                    <p className="text-[10px] uppercase font-bold text-emerald-400">Ghana</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile User Card */}
              <div className="mx-3 mt-3 mb-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 font-bold text-xs text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">
                      {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
                    </p>
                    <p className="text-[10px] text-slate-400">{mode === 'admin' ? 'Admin' : 'Agent'}</p>
                  </div>
                </div>
                {mode === 'agent' && (
                  <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Balance:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {formatCurrency(Number(wallet?.availableBalance ?? 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* Drawer Links */}
              <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2 scrollbar-thin">
                {sections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {section.title}
                    </p>
                    {section.links.map((link) => (
                      <NavItem
                        key={link.href}
                        link={link}
                        isActive={pathname === link.href}
                        cartItems={cartItems}
                        onClick={() => setMobileNavOpen(false)}
                      />
                    ))}
                  </div>
                ))}
              </nav>

              {/* Drawer Logout */}
              <div className="border-t border-white/[0.06] p-3">
                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0b101d]/80 backdrop-blur-xl px-4 py-3 lg:px-6">
          {/* Mobile Header Row */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate">{title}</h1>
                <p className="text-[11px] text-slate-400 truncate">
                  Welcome back, {user?.firstName || 'User'} 👋
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              {mode === 'agent' && (
                <Link
                  href="/wallet"
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-bold text-emerald-300"
                >
                  <Wallet className="h-3 w-3" />
                  {formatCurrency(Number(wallet?.availableBalance ?? 0))}
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Header Row */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-base font-extrabold text-white tracking-tight">{title}</h1>
                <p className="text-xs text-slate-400">{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Agent Balance Pill */}
              {mode === 'agent' && (
                <Link
                  href="/wallet"
                  className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs transition-all hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Balance</p>
                    <p className="font-mono font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {formatCurrency(Number(wallet?.availableBalance ?? 0))}
                    </p>
                  </div>
                </Link>
              )}

              {/* Cart Button */}
              {mode === 'agent' && (
                <Link
                  href="/cart"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/[0.15] transition-colors"
                  title="Shopping Cart"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cartItems > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-black text-white shadow-sm">
                      {cartItems}
                    </span>
                  )}
                </Link>
              )}

              {/* Notifications */}
              <Link
                href="/notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/[0.15] transition-colors"
                title="Notifications & Alerts"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-violet-400 ring-2 ring-[#0b101d]" />
              </Link>

              <ThemeSwitcher />

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 hover:border-white/[0.15] transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 font-bold text-xs text-white">
                    {initials}
                  </div>
                  <span className="font-semibold">{user?.firstName || 'User'}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f172a] shadow-2xl backdrop-blur-2xl">
                      <div className="px-4 py-3 border-b border-white/[0.06]">
                        <p className="text-xs font-bold text-white truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                      >
                        <User className="h-4 w-4 text-slate-400" /> My Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                      >
                        <Settings className="h-4 w-4 text-slate-400" /> Settings
                      </Link>
                      <div className="border-t border-white/[0.06]" />
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1 p-4 sm:p-5 lg:p-6"
        >
          {children}
        </motion.main>

        {/* Footer */}
        <footer className="mt-auto border-t border-white/[0.05] py-4 px-6 text-center">
          <PoweredBy variant="dark" />
        </footer>

        {mode === 'agent' && <WhatsAppBubble />}
      </div>
    </div>
  );
}
