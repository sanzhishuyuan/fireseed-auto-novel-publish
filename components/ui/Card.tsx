'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  clickable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Card({ children, className = '', hover = false, clickable = false, padding = 'md', style }: CardProps) {
  const paddingClasses: Record<string, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const interactive = hover || clickable;
  const cls = `${interactive ? 'card hover:shadow-md hover:-translate-y-0.5' : 'card-base'} ${paddingClasses[padding] || paddingClasses.md} ${className}`.trim();

  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}
