import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(
          'w-full rounded-xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-sm px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500',
          'transition-all duration-200 hover:border-gray-600/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-slate-900/80 resize-none',
          props.className,
        )}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
