import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
import { Zap, ShieldCheck, Globe, Star } from 'lucide-react';

const highlights = [
  { icon: Zap, label: 'Instant Data Delivery' },
  { icon: ShieldCheck, label: 'Bank-Grade Security' },
  { icon: Globe, label: 'All Ghana Networks' },
];

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen bg-[#060a14] overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="absolute -right-40 -bottom-40 h-[500px] w-[500px] rounded-full bg-sky-600/8 blur-[120px]" />

      {/* Left panel - hidden on small screens */}
      <div className="relative hidden w-2/5 flex-col justify-between p-12 lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-600/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-bold tracking-wide text-white">CheapDataPacks</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500">Ghana</p>
            </div>
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-2xl font-semibold leading-snug text-white">
              &ldquo;Started as a side hustle, now I run a full data reselling business. CheapDataPacks made it possible.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm text-gray-400">
              <span className="font-semibold text-white">Ama D.</span> — Reseller, Kumasi
            </p>
          </div>

          <div className="flex gap-8">
            {highlights.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.label} className="flex items-center gap-2 text-sm text-gray-400">
                  <Icon className="h-4 w-4 text-violet-400" />
                  <span>{h.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-6 py-12 lg:items-center lg:py-0">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative w-full max-w-2xl">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-bold tracking-wide text-white">CheapDataPacks</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500">Ghana</p>
            </div>
          </div>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
