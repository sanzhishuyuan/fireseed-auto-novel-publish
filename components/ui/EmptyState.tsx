'use client';

import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode | { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export function EmptyState({ icon = '✦', title, description, action, className = '' }: EmptyStateProps) {
  const renderAction = (): React.ReactNode => {
    if (!action) return null;
    if (React.isValidElement(action)) return action;
    const act = action as { label: string; onClick?: () => void; href?: string };
    if (act.href) {
      return <Button asChild><a href={act.href}>{act.label}</a></Button>;
    }
    return <Button onClick={act.onClick}>{act.label}</Button>;
  };
  const actionEl = renderAction();

  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {actionEl && <div>{actionEl}</div>}
    </div>
  );
}
