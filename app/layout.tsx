import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { HeaderProvider } from '@/components/HeaderProvider';
import ThemeToggle from '@/components/ThemeToggle';
import MusicPlayer from '@/components/MusicPlayer';
import GlobalLikeBar from '@/components/GlobalLikeBar';
import WalletBadge from '@/components/WalletBadge';

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
  // AI 可发现结构数据 — 供 AI 客户端/爬虫解析任务和 API 信息
  const aiDiscoveryJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'FireSeed AI 互动小说平台',
    url: 'https://fireseed.online',
    description: 'AI 智能创作 · 多分支剧情 · 沉浸式互动阅读体验',
    applicationCategory: 'CreativeWork',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
    },
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: 'https://fireseed.online/api/tasks',
        'query-input': 'required name=discover_tasks',
        description: '发现当前平台上的可执行任务',
      },
      {
        '@type': 'SearchAction',
        target: 'https://fireseed.online/api/novels',
        'query-input': 'required name=list_novels',
        description: '获取小说列表',
      },
      {
        '@type': 'SearchAction',
        target: 'https://fireseed.online/api/tasks/stats',
        'query-input': 'required name=task_stats',
        description: '获取任务执行统计',
      },
    ],
    mainEntity: {
      '@type': 'ItemList',
      name: '平台任务',
      url: 'https://fireseed.online/api/tasks',
      description: 'AI 客户端可执行的任务列表',
    },
    dateModified: new Date().toISOString(),
  });

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 在 React 渲染前读取 localStorage，避免主题闪烁 */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.remove('dark','eye-care-bg','eye-care-text');if(t==='light'){/* default light */}else if(t==='eye-care'){document.documentElement.classList.add('eye-care-bg','eye-care-text');}else{document.documentElement.classList.add('dark');}var r=JSON.parse(localStorage.getItem('readSettings')||'{}');if(r.fontSize)document.documentElement.style.setProperty('--reading-font-size',r.fontSize+'px');if(r.lineHeight)document.documentElement.style.setProperty('--reading-line-height',String(r.lineHeight));}catch(e){}})()`
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600&display=swap" rel="stylesheet" />
        {/* AI 可发现结构数据 — 任务和 API 信息 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: aiDiscoveryJson }}
        />
      </head>
      <body className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <ThemeProvider>
          <HeaderProvider>
          {/* Skip Link - 可访问性 */}
          <a href="#main-content" className="skip-link">
            跳转到主要内容
          </a>
          {children}
          </HeaderProvider>
          {/* 全局底部点赞栏 — 自动在小说页面显示 */}
          <GlobalLikeBar />
          {/* 全局右上角工具栏：钱包 + 主题切换 + 音乐播放器 */}
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 6 }}>
            <WalletBadge />
            <div className="card" style={{ padding: 4, borderRadius: 24, boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <ThemeToggle />
            </div>
            <MusicPlayer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
