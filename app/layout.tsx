import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spark - AI 互动小说平台',
  description: 'AI 智能创作 · 多分支剧情 · 沉浸式互动阅读体验',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
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
      </body>
    </html>
  );
}
