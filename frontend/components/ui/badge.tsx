import { cn, getStatusColor } from '@/lib/utils';

const variants = {
  default: 'bg-violet-600/20 text-violet-400 border border-violet-500/30',
  secondary: 'bg-gray-700/30 text-gray-300 border border-gray-600/30',
  success: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
  danger: 'bg-rose-600/20 text-rose-400 border border-rose-500/30',
};

export function Badge({ 
  value, 
  children,
  variant = 'default',
  className 
}: { 
  value?: string; 
  children?: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string 
}) {
  const content = children || (value ? value.replace(/_/g, ' ').toLowerCase() : '');
  const statusColor = value && !children ? getStatusColor(value) : variants[variant];
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize border',
        statusColor || variants[variant],
        className,
      )}
    >
      {content}
    </span>
  );
}
