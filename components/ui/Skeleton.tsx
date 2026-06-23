'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
}

export function Skeleton({ width, height, circle = false, className = '' }: SkeletonProps) {
  return (
    <div
      className={`${circle ? 'rounded-full' : 'rounded-[var(--radius-sm)]'} bg-[var(--bg-hover)] animate-pulse ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}
