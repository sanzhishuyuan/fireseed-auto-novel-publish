'use client';

import React from 'react';

interface SectionHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ label, title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-8 ${className}`}>
      <div>
        {label && (
          <div className="section-label">
            {label}
          </div>
        )}
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
