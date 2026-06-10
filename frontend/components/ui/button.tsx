import { cn } from '@/lib/utils';

const variants = {
  primary:
    'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-600/20',
  secondary: 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700',
  ghost: 'bg-transparent text-gray-300 hover:bg-gray-800',
  outline: 'bg-transparent text-white border border-gray-700 hover:border-violet-500 hover:text-violet-400',
};

const sizes = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
