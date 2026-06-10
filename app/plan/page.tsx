'use client';

import { getPlanMetadata } from '@/lib/seo';


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
