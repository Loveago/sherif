'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

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
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-600/30 md:h-9 md:w-9">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white md:h-5 md:w-5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold tracking-wide text-white md:text-[13px]">DATAHUB</p>
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-gray-500 md:text-[9px]">Ghana</p>
          </div>
        </Link>

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
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-3 py-2 text-xs font-semibold tracking-wide text-white shadow-lg shadow-violet-600/30 transition-all duration-200 hover:from-violet-700 hover:to-violet-800 hover:shadow-xl hover:shadow-violet-600/40 active:scale-95"
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
