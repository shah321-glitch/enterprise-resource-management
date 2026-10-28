import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils.js';

export const Dropdown = ({
  trigger,
  children,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const alignStyles = {
    right: 'right-0',
    left: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen((prev) => !prev)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute mt-2 min-w-[12rem] rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl z-50 animate-in fade-in-0 zoom-in-95',
            alignStyles[align] || alignStyles.right,
            className
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({
  children,
  onClick,
  icon: Icon,
  variant = 'default',
  disabled = false,
  className,
}) => {
  const variantStyles = {
    default: 'text-foreground hover:bg-secondary focus:bg-secondary',
    destructive: 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10',
    success: 'text-emerald-500 hover:bg-emerald-500/10 focus:bg-emerald-500/10',
  };

  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
      <span>{children}</span>
    </button>
  );
};

export const DropdownDivider = () => <div className="h-px bg-border my-1 -mx-1" />;

