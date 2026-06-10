import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full rounded-xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-sm px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500',
          'transition-all duration-200 hover:border-gray-600/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-slate-900/80',
          props.className,
        )}
      />
    );
  },
);
Input.displayName = 'Input';
