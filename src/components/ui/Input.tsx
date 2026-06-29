import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'min-h-12 w-full rounded-lg border border-control-line bg-control px-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow,background-color] placeholder:text-ink-muted focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    );
  },
);
