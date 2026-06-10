import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(
          'w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30',
          props.className,
        )}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
