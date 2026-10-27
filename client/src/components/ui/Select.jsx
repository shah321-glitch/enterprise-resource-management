import React from 'react';
import { cn } from '../../lib/utils.js';

export const Select = React.forwardRef(({ className, error, options = [], children, ...props }, ref) => {
  return (
    <div className="w-full">
      <select
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground bg-card',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-card text-foreground">
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';

