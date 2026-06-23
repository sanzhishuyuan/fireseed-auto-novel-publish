'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'eye-care';

interface ReadingPrefs {
  fontSize: number;
  lineHeight: number;
}

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
  reading: ReadingPrefs;
  setReadingPref: (prefs: Partial<ReadingPrefs>) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/** 将主题模式同步到 DOM 和 localStorage */
function applyTheme(mode: ThemeMode) {
  const el = document.documentElement;
  el.classList.remove('dark', 'eye-care-bg', 'eye-care-text');

  if (mode === 'dark') {
    el.classList.add('dark');
  } else if (mode === 'eye-care') {
    el.classList.add('eye-care-bg', 'eye-care-text');
  }

  localStorage.setItem('theme', mode);
}

/** 将阅读排版偏好同步到 CSS 变量 */
function applyReading(p: ReadingPrefs) {
  document.documentElement.style.setProperty('--reading-font-size', `${p.fontSize}px`);
  document.documentElement.style.setProperty('--reading-line-height', String(p.lineHeight));
}

const DEFAULT_READING: ReadingPrefs = { fontSize: 18, lineHeight: 1.9 };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [reading, setReadingState] = useState<ReadingPrefs>(DEFAULT_READING);

  // 初始化：从 localStorage 读取
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    if (savedTheme && ['light', 'dark', 'eye-care'].includes(savedTheme)) {
      setModeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('light');
    }

    try {
      const savedReading = localStorage.getItem('readSettings');
      if (savedReading) {
        const parsed = JSON.parse(savedReading);
        const prefs: ReadingPrefs = {
          fontSize: parsed.fontSize ?? DEFAULT_READING.fontSize,
          lineHeight: parsed.lineHeight ?? DEFAULT_READING.lineHeight,
        };
        setReadingState(prefs);
        applyReading(prefs);
      }
    } catch { /* ignore parse errors */ }
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyTheme(next);
  }, []);

  const toggleDark = useCallback(() => {
    setModeState(prev => {
      // 护眼视为亮色变体 → 切到暗色；暗色 → 亮色；亮色 → 暗色
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);

  const setReadingPref = useCallback((partial: Partial<ReadingPrefs>) => {
    setReadingState(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('readSettings', JSON.stringify(next));
      applyReading(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, isDark: mode === 'dark', setMode, toggleDark, reading, setReadingPref }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
