import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Button — 4 variants only. See tokens.ts for full spec.
 *
 * primary      → blue bg, white text  (default)
 * cta          → green bg, dark text
 * ghost        → transparent, blue text
 * destructive  → red bg, white text (delete/danger actions)
 */
const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center rounded-pill text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:     'bg-obra-blue-700 text-white hover:bg-obra-blue-900',
        cta:         'bg-obra-green-400 text-obra-blue-950 hover:brightness-105',
        ghost:       'bg-transparent text-obra-blue-700 hover:bg-obra-blue-50',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        default: 'h-10 px-5 py-2',
        lg:      'h-11 px-6',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
