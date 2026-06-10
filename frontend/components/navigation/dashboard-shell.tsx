'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CreditCard, Gauge, LayoutGrid, LifeBuoy, LogOut, Package, Search, Settings, ShoppingBag, Store, Wallet, ChevronDown, User, Link2, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
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
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/failed-payments', label: 'Failed Payments', icon: AlertCircle },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/commissions', label: 'Transactions', icon: Gauge },
  { href: '/referrals', label: 'Referrals', icon: Link2 },
  { href: '/afa-registration', label: 'AFA Registration', icon: FileText },
  { href: '/api-keys', label: 'API Keys', icon: CreditCard },
  { href: '/storefront-analytics', label: 'Analytics', icon: Gauge },
  { href: '/complaints', label: 'Complaints', icon: LifeBuoy },
  { href: '/storefront', label: 'Storefront', icon: Store },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/notifications', label: 'Support', icon: Bell },
];

const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Admin Dashboard', icon: Gauge },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag },
  { href: '/admin/user-management', label: 'User Management', icon: LayoutGrid },
  { href: '/admin/commissions', label: 'Commissions', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: Gauge },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: Bell },
  { href: '/admin/operations', label: 'Operations', icon: Bell },
  { href: '/admin/settings', label: 'System Settings', icon: Settings },
];

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

  return (
    <div className="flex min-h-screen bg-[#060a14]">
      {/* Sidebar */}
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
            <p className="text-sm font-medium text-white truncate">{user ? `${user.firstName} ${user.lastName}` : 'Guest'}</p>
            <p className="text-xs text-gray-500">{mode === 'admin' ? 'Administrator' : 'Customer'}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const cartItems = useCartStore((state) => state.getItemCount());

            return (
              <Link
                key={link.href}
                href={link.href}
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
          })}
        </nav>

      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-gray-800 bg-[#0b1120] px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                readOnly
                value="Search for anything..."
                className="w-80 rounded-xl border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-gray-400 outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-gray-400 hover:text-white">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-500" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
              {user?.firstName?.[0] || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 p-6"
        >
          {/* Welcome Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome back, {user?.firstName || 'User'}! 👋</h1>
              <p className="mt-1 text-sm text-gray-400">Here's what's happening with your account today.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2">
                <p className="text-xs text-gray-400">Wallet Balance</p>
                <p className="text-lg font-bold text-white">GHS {Number(user?.wallet?.availableBalance ?? 0).toFixed(2)}</p>
              </div>
              <Button>+ Fund Wallet</Button>
            </div>
          </div>

          {children}
        </motion.main>
      </div>
    </div>
  );
}
