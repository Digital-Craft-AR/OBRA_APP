import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Label — single style, no variants.
 * text-sm font-semibold text-obra-blue-950
 * Use className to override color only when inside a dark section.
 */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

function Label({ className, ...props }: LabelProps): React.JSX.Element {
  return (
    <label
      className={cn('text-sm font-semibold text-obra-blue-950', className)}
      {...props}
    />
  );
}

export { Label };
