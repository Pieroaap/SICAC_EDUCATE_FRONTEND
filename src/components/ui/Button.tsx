import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white shadow-sm hover:bg-brand-hover',
        secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
        ghost: 'text-ink-secondary hover:bg-canvas hover:text-ink',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
  & VariantProps<typeof buttonVariants>
  & { asChild?: boolean };

export function Button({
  asChild,
  className,
  variant,
  type = 'button',
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant }), className)} type={type} {...props} />;
}
