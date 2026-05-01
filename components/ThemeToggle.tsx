'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // 初始化：读取 localStorage 或默认暗色
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : true;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="btn-ghost"
      style={{ fontSize: '18px', lineHeight: 1 }}
      title={dark ? '切换日间模式' : '切换夜间模式'}
      aria-label={dark ? '切换日间模式' : '切换夜间模式'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
