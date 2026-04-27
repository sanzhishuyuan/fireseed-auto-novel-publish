'use client';

import { useState, useEffect } from 'react';

export default function ReadingControls() {
  const [settings, setSettings] = useState({
    fontSize: 16,
    lineHeight: 1.8,
    theme: 'light'
  });

  useEffect(() => {
    const saved = localStorage.getItem('readSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const updateSettings = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('readSettings', JSON.stringify(newSettings));
    
    document.documentElement.style.setProperty('--reading-font-size', `${newSettings.fontSize}px`);
    document.documentElement.style.setProperty('--reading-line-height', String(newSettings.lineHeight));
    
    document.documentElement.classList.remove('dark', 'dark-mode', 'eye-care');
    if (newSettings.theme === 'dark') {
      document.documentElement.classList.add('dark', 'dark-mode');
    } else if (newSettings.theme === 'eye-care') {
      document.documentElement.classList.add('eye-care');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => document.getElementById('settings-panel')?.classList.toggle('hidden')}
        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        ⚙️
      </button>
      
      <div id="settings-panel" className="hidden absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-50">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">字号</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => updateSettings('fontSize', Math.max(12, settings.fontSize - 2))}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded">A-</button>
              <span className="text-center flex-1">{settings.fontSize}px</span>
              <button onClick={() => updateSettings('fontSize', Math.min(24, settings.fontSize + 2))}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded">A+</button>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">行距</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => updateSettings('lineHeight', Math.max(1.2, settings.lineHeight - 0.2))}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded">≡-</button>
              <span className="text-center flex-1">{settings.lineHeight}</span>
              <button onClick={() => updateSettings('lineHeight', Math.min(2.5, settings.lineHeight + 0.2))}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded">≡+</button>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">背景</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => updateSettings('theme', 'light')}
                className={`flex-1 py-2 rounded ${settings.theme === 'light' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                日间
              </button>
              <button onClick={() => updateSettings('theme', 'dark')}
                className={`flex-1 py-2 rounded ${settings.theme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                夜间
              </button>
              <button onClick={() => updateSettings('theme', 'eye-care')}
                className={`flex-1 py-2 rounded ${settings.theme === 'eye-care' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                护眼
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
