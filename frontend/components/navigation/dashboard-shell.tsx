'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell, CreditCard, Gauge, LayoutGrid, LifeBuoy, LogOut,
  Package, Search, Settings, ShoppingBag, Store, Wallet,
  ChevronDown, User, Link2, AlertCircle, FileText,
  Menu, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { Button } from '@/components/ui/button';

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: boolean;
}

const agentLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/buy-data', label: 'Buy Data', icon: ShoppingBag },
  { href: '/cart', label: 'Cart', icon: ShoppingBag, badge: true },
  { href: '/bulk-orders', label: 'Bulk Data', icon: CreditCard },
  { href: '/orders-tracking', label: 'Orders Tracking', icon: Package },
  { href: '/failed-payments', label: 'Failed Payments', icon: AlertCircle },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/commissions', label: 'Transactions', icon: Gauge },
  { href: '/referrals', label: 'Referrals', icon: Link2 },
  { href: '/afa-registration', label: 'AFA Registration', icon: FileText },
  { href: '/api-keys', label: 'API Keys', icon: CreditCard },
  { href: '/storefront-analytics', label: 'Analytics', icon: Gauge },
  { href: '/complaints', label: 'Complaints', icon: LifeBuoy },
  { href: '/storefront', label: 'Storefront', icon: Store },
  { href: '/notifications', label: 'Support', icon: Bell },
];

const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Admin Dashboard', icon: Gauge },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/user-management', label: 'User Management', icon: LayoutGrid },
  { href: '/admin/commissions', label: 'Commissions', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: Gauge },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: Bell },
  { href: '/admin/operations', label: 'Operations', icon: Bell },
  { href: '/admin/settings', label: 'System Settings', icon: Settings },
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
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors relative',
        isActive
          ? 'bg-violet-600/10 text-violet-400'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{link.label}</span>
      {'badge' in link && link.badge && cartItems > 0 && (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
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
  const links = mode === 'admin' ? adminLinks : agentLinks;
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const cartItems = useCartStore((state) => state.getItemCount());

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const initials = user?.firstName?.[0]?.toUpperCase() || 'U';

  return (
    <div className="flex min-h-screen bg-[#060a14]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-800 bg-[#0b1120] lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5">
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

        {/* User Profile */}
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600/20 text-violet-400">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
            </p>
            <p className="text-xs text-gray-500">
              {mode === 'admin' ? 'Administrator' : 'Customer'}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {links.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              isActive={pathname === link.href}
              cartItems={cartItems}
            />
          ))}
        </nav>

        {/* Admin Logout */}
        {mode === 'admin' && (
          <div className="px-3 pb-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 z-50 h-full w-[260px] flex-col border-r border-gray-800 bg-[#0b1120] lg:hidden flex"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-white">DATAHUB</p>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile User Profile */}
              <div className="mx-4 mt-4 mb-2 flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {mode === 'admin' ? 'Administrator' : 'Customer'}
                  </p>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                {links.map((link) => (
                  <NavItem
                    key={link.href}
                    link={link}
                    isActive={pathname === link.href}
                    cartItems={cartItems}
                    onClick={() => setMobileNavOpen(false)}
                  />
                ))}
              </nav>

              {/* Mobile Logout */}
              <div className="border-t border-gray-800 px-3 py-3">
                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-gray-800 bg-[#0b1120] px-4 py-3 lg:px-6 lg:py-4">
          {/* Left: Mobile hamburger + Page title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-gray-400 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  readOnly
                  value="Search for anything..."
                  className="w-72 lg:w-80 rounded-xl border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-gray-400 outline-none focus:border-violet-500"
                />
              </div>
            </div>
            {/* Mobile page title */}
            <h1 className="truncate text-sm font-semibold text-white lg:hidden">
              {title}
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            <Link href="/notifications" className="hidden sm:block">
              <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-gray-400 hover:text-white">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-500" />
              </button>
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
              >
                {initials}
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-gray-700 bg-[#0f172a] shadow-xl">
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <div className="border-t border-gray-700/50" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 p-3 sm:p-4 lg:p-6"
        >
          {/* Welcome Header */}
          <div className="mb-4 lg:mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                Welcome back, {user?.firstName || 'User'}! 👋
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-gray-400">
                Here's what's happening with your account today.
              </p>
            </div>
            {mode !== 'admin' && (
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 sm:px-4">
                  <p className="text-[10px] sm:text-xs text-gray-400">Wallet Balance</p>
                  <p className="text-base sm:text-lg font-bold text-white">
                    GHS {Number(user?.wallet?.availableBalance ?? 0).toFixed(2)}
                  </p>
                </div>
                <Link href="/wallet" className="hidden sm:block">
                  <Button size="sm" className="lg:text-base lg:h-10">+ Fund Wallet</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile-only fund wallet link */}
          {mode !== 'admin' && (
            <Link href="/wallet" className="mb-3 block sm:hidden">
              <Button className="w-full">+ Fund Wallet</Button>
            </Link>
          )}

          {children}
        </motion.main>
      </div>
    </div>
  );
}
