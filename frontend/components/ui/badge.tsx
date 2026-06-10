import { cn, getStatusColor } from '@/lib/utils';

export function Badge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        getStatusColor(value),
        className,
      )}
    >
      {value.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}
