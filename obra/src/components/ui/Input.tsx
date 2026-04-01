import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Input — single style everywhere in the app. See tokens.ts for full spec.
 * No variants. Never a different style on any screen.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-11 w-full rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 py-2 text-sm text-obra-neutral-900 outline-none transition-all duration-150',
          'placeholder:text-obra-neutral-400',
          'focus:border-obra-blue-700 focus:bg-white focus:ring-2 focus:ring-obra-blue-700/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export { Input };
