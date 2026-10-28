import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils.js';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message, duration: 6000 }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Notice') => addToast({ type: 'info', title, message }),
    dismiss: removeToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Floating Container */}
      <aside
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />,
            warning: <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />,
            info: <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />,
          };

          const borders = {
            success: 'border-emerald-500/30 bg-emerald-500/10',
            warning: 'border-amber-500/30 bg-amber-500/10',
            error: 'border-destructive/30 bg-destructive/10',
            info: 'border-blue-500/30 bg-blue-500/10',
          };

          return (
            <div
              key={t.id}
              role="alert"
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-card text-card-foreground shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in',
                borders[t.type] || 'border-border'
              )}
            >
              {icons[t.type] || icons.info}
              <div className="flex-1 min-w-0">
                {t.title && <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>}
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

