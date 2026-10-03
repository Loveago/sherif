'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#networks', label: 'Networks' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#contact', label: 'Contact' },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-[#060a14]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <Logo linkTo="/" size="sm" />

        <nav className="hidden items-center gap-7 text-sm text-gray-400 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-gray-400 transition-colors hover:text-white sm:block">
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold tracking-wide btn-primary transition-all duration-200 active:scale-95"
          >
            Get Started
          </Link>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-800/60 bg-[#060a14]/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-white sm:hidden"
              onClick={() => setOpen(false)}
            >
              Sign In
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
