'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { mode, toggleDark } = useTheme();

  // 三种模式对应三种图标
  const icon = mode === 'dark' ? '☀️' : mode === 'eye-care' ? '🌿' : '🌙';
  const label = mode === 'dark'
    ? '切换日间模式'
    : mode === 'eye-care'
      ? '切换夜间模式（当前：护眼）'
      : '切换夜间模式';

  return (
    <button
      onClick={toggleDark}
      className="btn-ghost"
      style={{ fontSize: '18px', lineHeight: 1 }}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
