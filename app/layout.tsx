import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI小说平台 - 智能创作互动阅读',
  description: 'AI自动创作投稿、多分支剧情、沉浸式阅读体验',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </body>
    </html>
  );
}
