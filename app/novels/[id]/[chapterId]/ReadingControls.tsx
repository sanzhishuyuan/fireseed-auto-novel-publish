'use client';

import { useState, useEffect } from 'react';

interface ReadSettings {
  fontSize: number;
  lineHeight: number;
  theme: 'light' | 'dark' | 'eye-care';
}

export default function ReadingControls() {
  const [settings, setSettings] = useState<ReadSettings>({
    fontSize: 18,
    lineHeight: 1.9,
    theme: 'light'
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('readSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      applySettings(parsed);
    }
  }, []);

  const applySettings = (s: ReadSettings) => {
    document.documentElement.style.setProperty('--reading-font-size', `${s.fontSize}px`);
    document.documentElement.style.setProperty('--reading-line-height', String(s.lineHeight));

    // 移除所有主题类
    document.documentElement.classList.remove('dark', 'dark-mode', 'eye-care-bg', 'eye-care-text');

    if (s.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (s.theme === 'eye-care') {
      document.documentElement.classList.add('eye-care-bg');
    }
  };

  const updateSettings = (key: keyof ReadSettings, value: number | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('readSettings', JSON.stringify(newSettings));
    applySettings(newSettings);
  };

  const themes = [
    { key: 'light', label: '白天', bg: '#ffffff', text: '#1a1a2e' },
    { key: 'dark', label: '夜间', bg: '#0f0f1a', text: '#f0f0f5' },
    { key: 'eye-care', label: '护眼', bg: '#fdf6e3', text: '#3d3d3d' }
  ] as const;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost p-2"
        title="阅读设置"
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
                  onClick={() => updateSettings('fontSize', Math.max(12, settings.fontSize - 1))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  A—
                </button>
                <span className="flex-1 text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {settings.fontSize}px
                </span>
                <button
                  onClick={() => updateSettings('fontSize', Math.min(24, settings.fontSize + 1))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
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
                  onClick={() => updateSettings('lineHeight', Math.max(1.4, parseFloat((settings.lineHeight - 0.1).toFixed(1))))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  ≡—
                </button>
                <span className="flex-1 text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {settings.lineHeight.toFixed(1)}
                </span>
                <button
                  onClick={() => updateSettings('lineHeight', Math.min(2.5, parseFloat((settings.lineHeight + 0.1).toFixed(1))))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
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
                    onClick={() => updateSettings('theme', t.key)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: settings.theme === t.key ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: settings.theme === t.key ? '#fff' : 'var(--text-secondary)'
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
