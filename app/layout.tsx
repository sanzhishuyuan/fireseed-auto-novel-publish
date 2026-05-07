import type { Metadata } from 'next';
import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';
import MusicPlayer from '@/components/MusicPlayer';

export const metadata: Metadata = {
  title: 'FireSeed - AI 互动小说平台',
  description: 'AI 智能创作 · 多分支剧情 · 沉浸式互动阅读体验',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport = 'width=device-width, initial-scale=1, viewport-fit=cover';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 在 React 渲染前读取 localStorage，避免闪烁 */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark')}catch(e){}})()`
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        {/* Skip Link - 可访问性 */}
        <a href="#main-content" className="skip-link">
          跳转到主要内容
        </a>
        {children}
        {/* 全局主题切换按钮 */}
        <div style={{ position: 'fixed', bottom: 20, right: 80, zIndex: 999 }}>
          <div className="card" style={{ padding: 6, borderRadius: 30, boxShadow: 'var(--shadow-lg)' }}>
            <ThemeToggle />
          </div>
        </div>
        <MusicPlayer />
      </body>
    </html>
  );
}
