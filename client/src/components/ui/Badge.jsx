import React from 'react';
import { cn } from '../../lib/utils.js';

export const Badge = ({ className, variant = 'default', dot = false, children, ...props }) => {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground border border-border',
    destructive: 'bg-destructive/15 text-destructive border border-destructive/20',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    outline: 'border border-border text-foreground bg-card/40',
  };

  const dotColors = {
    default: 'bg-primary-foreground',
    secondary: 'bg-muted-foreground',
    destructive: 'bg-destructive',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    outline: 'bg-foreground',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none select-none',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full animate-pulse', dotColors[variant] || 'bg-current')}
        />
      )}
      <span>{children}</span>
    </div>
  );
};
