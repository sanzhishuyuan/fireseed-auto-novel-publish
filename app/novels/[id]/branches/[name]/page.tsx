'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BranchChapter {
  id: string;
  title: string;
  order: number;
  branch: string;
  word_count: number;
  author_name: string;
  created_at: string;
}

export default function BranchPage({ params }: { params: { id: string; name: string } }) {
  const [chapters, setChapters] = useState<BranchChapter[]>([]);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [novelTitle, setNovelTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    document.title = `分支 - ${params.name} - Spark`;
    Promise.all([
      fetch(`/api/novels/${params.id}`).then(r => r.json()),
      fetch(`/api/novels/${params.id}/branches/${params.name}/chapters`).then(r => r.json())
    ])
      .then(([novelData, chaptersData]) => {
        const novel = novelData.data || novelData;
        if (novel?.title) {
          setNovelTitle(novel.title);
          document.title = `🌿 ${novel.title} - ${params.name}分支`;
        }
        if (chaptersData.success && Array.isArray(chaptersData.chapters)) {
          setChapters(chaptersData.chapters);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // 获取分支元信息
    fetch(`/api/novels/${params.id}/branches`).then(r => r.json()).then(data => {
      if (data.success) {
        const branch = data.branches.find((b: any) => b.branch_name === params.name);
        if (branch) setBranchInfo(branch);
      }
    }).catch(() => {});
  }, [params.id, params.name]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const totalWords = chapters.reduce((s, c) => s + (c.word_count || 0), 0);

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/novels/${params.id}`} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 8H3M7 4L3 8l4 4"/>
              </svg>
            </Link>
            <div>
              <p className="text-sm font-medium truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>{novelTitle}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🌿 {branchInfo?.title || params.name} 分支</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/novels/${params.id}`} className="btn-ghost text-sm">返回目录</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* 分支信息卡 */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(16,185,129,0.12)' }}>
              🌿
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {branchInfo?.title || params.name}
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                作者：{branchInfo?.author_name || 'AI'} · {chapters.length} 章 · {totalWords} 字
                {branchInfo?.created_at && ` · ${new Date(branchInfo.created_at).toLocaleDateString('zh-CN')}`}
              </p>
            </div>
          </div>
          {branchInfo?.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {branchInfo.description}
            </p>
          )}
        </div>

        {/* 章节列表 */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>章节列表（{chapters.length}章）</h2>
          </div>
          {chapters.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {chapters.map((chapter, index) => (
                <Link
                  key={chapter.id}
                  href={`/novels/${params.id}/${chapter.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {chapter.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {chapter.word_count || 0} 字 · by {chapter.author_name || 'AI'}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>该分支暂无章节</p>
            </div>
          )}
        </div>

        {/* 返回主线 */}
        <div className="text-center mt-6">
          <Link
            href={`/novels/${params.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            ← 返回主线目录
          </Link>
        </div>
      </div>
    </div>
  );
}
