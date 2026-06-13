'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell, CreditCard, Gauge, LayoutGrid, LifeBuoy, LogOut,
  Package, Search, Settings, ShoppingBag, ShoppingCart, Store, Wallet,
  ChevronDown, User, Link2, AlertCircle, FileText,
  Menu, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { WhatsAppBubble } from '@/components/whatsapp-bubble';

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
        {/* Top Header — Mobile-First Design */}
        <header className="border-b border-gray-800/60 bg-[#0b1120] px-4 py-3 lg:px-6 lg:py-4">
          {/* Mobile / Tablet header */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white truncate">{title}</h1>
                <p className="text-xs text-gray-400 truncate">
                  Good to see you again, {user?.firstName || 'User'}! 👋
                </p>
              </div>
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-sm font-bold text-white shadow-lg shadow-violet-600/30"
              >
                {initials}
              </button>
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#0b1120] bg-emerald-400" />
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-gray-700/60 bg-[#111827] shadow-2xl">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500">{mode === 'admin' ? 'Administrator' : 'Agent'}</p>
                    </div>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white transition-colors">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white transition-colors">
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <div className="border-t border-gray-800/60" />
                    <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <LogOut className="h-4 w-4" /> Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  readOnly
                  value="Search for anything..."
                  className="w-80 rounded-xl border border-gray-700 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-400 outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-gray-400 transition-colors hover:text-white"
              >
                <ShoppingCart className="h-4 w-4" />
                {cartItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-[#0b1120] bg-violet-500 px-1 text-[9px] font-bold text-white">
                    {cartItems}
                  </span>
                )}
              </Link>
              <Link
                href="/notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-gray-400 transition-colors hover:text-white"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b1120] bg-violet-500" />
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white hover:bg-violet-500 transition-colors"
                >
                  {initials}
                </button>
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#0b1120] bg-emerald-400" />
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-gray-700/60 bg-[#111827] shadow-2xl">
                      <div className="px-4 py-3 border-b border-gray-800">
                        <p className="text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-500">{mode === 'admin' ? 'Administrator' : 'Agent'}</p>
                      </div>
                      <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white transition-colors">
                        <User className="h-4 w-4" /> Profile
                      </Link>
                      <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white transition-colors">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                      <div className="border-t border-gray-800/60" />
                      <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 p-4 sm:p-5 lg:p-6"
        >
          {children}
        </motion.main>

        {mode === 'agent' && <WhatsAppBubble />}
      </div>
    </div>
  );
}
