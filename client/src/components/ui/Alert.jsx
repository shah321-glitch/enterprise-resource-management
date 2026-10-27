import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export const Alert = ({ className, variant = 'info', title, children, ...props }) => {
  const icons = {
    info: <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />,
    destructive: <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />,
  };

  const variants = {
    info: 'border-blue-500/20 bg-blue-500/10 text-foreground',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-foreground',
    warning: 'border-amber-500/20 bg-amber-500/10 text-foreground',
    destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
  };

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-lg border p-4 text-sm flex gap-3', variants[variant], className)}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1">
        {title && <h5 className="font-semibold leading-none tracking-tight mb-1">{title}</h5>}
        <div className="text-sm opacity-90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
