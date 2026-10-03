import { cn } from '@/lib/utils';

export function GlassCard({
  className,
  children,
  hoverEffect = false,
}: {
  className?: string;
  children?: React.ReactNode;
  hoverEffect?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/[0.08] bg-[#0c1322]/80 backdrop-blur-xl',
        'shadow-[0_8px_30px_rgb(0,0,0,0.3)]',
        hoverEffect && 'transition-all duration-200 hover:border-white/[0.18] hover:shadow-[0_12px_40px_rgb(0,0,0,0.45)] hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}
