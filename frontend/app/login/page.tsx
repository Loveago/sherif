import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { Zap, ShieldCheck, Globe, Star } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

const highlights = [
  { icon: Zap, label: 'Instant Data Delivery' },
  { icon: ShieldCheck, label: 'Bank-Grade Security' },
  { icon: Globe, label: 'All Ghana Networks' },
];

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen bg-[#060a14] overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="absolute -right-40 -bottom-40 h-[500px] w-[500px] rounded-full bg-sky-600/8 blur-[120px]" />

      {/* Left panel - hidden on small screens */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 lg:flex">
        <div>
          <Logo linkTo="/" size="md" />
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-2xl font-semibold leading-snug text-white">
              &ldquo;CheapDataPacks transformed my reselling business. I process hundreds of orders daily with zero downtime.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm text-gray-400">
              <span className="font-semibold text-white">Kwame A.</span> — Top Agent, Accra
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
      <div className="relative flex flex-1 items-center justify-center p-6">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <Logo linkTo="/" size="md" />
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
