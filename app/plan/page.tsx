'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PlanPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/fireseed-100-writers-plan.md')
      .then(res => res.text())
      .then(text => setContent(text))
      .catch(() => setContent('文档加载失败，请稍后重试。'))
      .finally(() => setLoading(false));
  }, []);

  // 简单的 Markdown 转 HTML（仅处理标题、段落、列表）
  function renderMarkdown(text: string): string {
    return text
      .split('\n')
      .map(line => {
        if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
        if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
        if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
        if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
        if (line.startsWith('**') && line.endsWith('**')) return `<strong>${line.slice(2, -2)}</strong>`;
        if (line.trim() === '') return '<br/>';
        return `<p>${line}</p>`;
      })
      .join('\n');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="FireSeed 首页">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="url(#grad)" />
              <path d="M8 14C8 14 10 8 14 8C18 8 20 14 20 14C20 14 18 20 14 20C10 20 8 14 8 14Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="14" cy="14" r="3" fill="white"/>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="var(--accent)"/>
                  <stop offset="100%" stopColor="var(--accent-light)"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              FireSeed
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm px-4 py-2 rounded-lg transition-all"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
          >
            ← 返回首页
          </Link>
        </div>
      </header>

      {/* 文档内容 */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <article
          className="prose prose-sm max-w-none"
          style={{
            color: 'var(--text-primary)',
            lineHeight: 1.8,
          }}
        >
          {loading ? (
            <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
              <div className="animate-pulse">加载中...</div>
            </div>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              style={{
                fontSize: '0.95rem',
              }}
            />
          )}
        </article>

        <div className="mt-12 text-center pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              color: '#fff',
            }}
          >
            ← 返回 FireSeed 首页
          </Link>
        </div>
      </main>
    </div>
  );
}
