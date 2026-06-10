import { cn } from '@/lib/utils';

export function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-2xl border border-gray-700/50 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl',
      'shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300',
      'hover:border-gray-600/50',
      className
    )}>
      {children}
    </div>
  );
}
