'use client';

import React, { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  asChild?: boolean;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: { background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: '#fff', border: 'none' },
  secondary: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
  outline: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  danger: { background: 'var(--color-error-bg)', color: 'var(--color-error)', border: '1px solid var(--color-error-border)' },
  success: { background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)' },
};

const baseCls = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all duration-200 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const sizeCls: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, asChild = false, disabled, className = '', children, style, ...props }, ref) => {
    const isDisabled = disabled || loading;
    const classes = [baseCls, sizeCls[size], className].filter(Boolean).join(' ');
    const resolvedStyle = { ...variantStyles[variant], ...style };

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<any>;
      return React.cloneElement(child, {
        className: [classes, child.props.className].filter(Boolean).join(' '),
        style: { ...resolvedStyle, ...child.props.style },
        'aria-disabled': isDisabled || undefined,
        ...props,
      });
    }

    return (
      <button ref={ref} disabled={isDisabled} className={classes} style={resolvedStyle} {...props}>
        {loading && (
          <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
