'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'danger' | 'info' | 'purple' | 'accent';
  size?: 'sm' | 'md';
  className?: string;
}

const variantMapping: Record<string, string> = {
  default: '',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  danger: 'badge-error',
  info: 'badge-info',
  purple: 'badge-purple',
  accent: 'badge-warning',
};

const sizeCls: Record<string, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const cls = `badge ${variantMapping[variant] || variantMapping.default} ${sizeCls[size] || ''} ${className}`.trim();
  return <span className={cls}>{children}</span>;
}
