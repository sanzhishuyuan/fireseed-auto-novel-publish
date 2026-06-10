'use client';

import { useState } from 'react';
import { useTheme, type ThemeMode } from '@/components/ThemeProvider';

const themes: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: '白天' },
  { key: 'dark', label: '夜间' },
  { key: 'eye-care', label: '护眼' },
];

export default function ReadingControls() {
  const { mode, setMode, reading, setReadingPref } = useTheme();
  const [open, setOpen] = useState(false);

  const adjustFontSize = (delta: number) => {
    const next = Math.min(28, Math.max(12, reading.fontSize + delta));
    setReadingPref({ fontSize: next });
  };

  const adjustLineHeight = (delta: number) => {
    const next = Math.min(2.5, Math.max(1.4, parseFloat((reading.lineHeight + delta).toFixed(1))));
    setReadingPref({ lineHeight: next });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost p-2"
        title="阅读设置"
        aria-label="阅读设置"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="9" r="2"/>
          <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42"/>
        </svg>
      </button>

      {open && (
        <>
          {/* 点击外部关闭 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* 面板 */}
          <div
            className="absolute right-0 top-full mt-2 w-72 rounded-xl p-5 z-50 shadow-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            {/* 字号 */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                字号
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustFontSize(-1)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  aria-label="减小字号"
                >
                  A—
                </button>
                <span className="flex-1 text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {reading.fontSize}px
                </span>
                <button
                  onClick={() => adjustFontSize(1)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  aria-label="增大字号"
                >
                  A+
                </button>
              </div>
            </div>

            {/* 行距 */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                行距
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustLineHeight(-0.1)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  aria-label="减小行距"
                >
                  ≡—
                </button>
                <span className="flex-1 text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {reading.lineHeight.toFixed(1)}
                </span>
                <button
                  onClick={() => adjustLineHeight(0.1)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  aria-label="增大行距"
                >
                  ≡+
                </button>
              </div>
            </div>

            {/* 主题 */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                背景
              </label>
              <div className="flex gap-2">
                {themes.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setMode(t.key)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: mode === t.key ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: mode === t.key ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
