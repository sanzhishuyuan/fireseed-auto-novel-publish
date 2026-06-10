'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHeaderConfig } from '@/components/HeaderContext';

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
  const [sourceChapterOrder, setSourceChapterOrder] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    document.title = `分支 - ${params.name} - Spark`;
    Promise.all([
      fetch(`/api/novels/${params.id}`).then(r => r.json()),
      fetch(`/api/novels/${params.id}/branches/${params.name}/chapters`).then(r => r.json()),
      fetch(`/api/novels/${params.id}/chapters`).then(r => r.json())
    ])
      .then(([novelData, chaptersData, allChaptersData]) => {
        const novel = novelData.data || novelData;
        if (novel?.title) {
          setNovelTitle(novel.title);
          document.title = `🌿 ${novel.title} - ${params.name}分支`;
        }
        if (chaptersData.success && Array.isArray(chaptersData.chapters)) {
          setChapters(chaptersData.chapters);
        }

        // 获取分支元信息
        fetch(`/api/novels/${params.id}/branches`).then(r => r.json()).then(data => {
          if (data.success) {
            const branch = data.branches.find((b: any) => b.branch_name === params.name);
            if (branch) {
              setBranchInfo(branch);

              // 查找源章节在主线中的序号
              if (branch.source_chapter_id) {
                const allChs: any[] = allChaptersData.chapters || allChaptersData.data || [];
                const mainChs = allChs.filter((c: any) => !c.branch || c.branch === 'main');
                const srcIdx = mainChs.findIndex((c: any) => c.id === branch.source_chapter_id);
                if (srcIdx >= 0) setSourceChapterOrder(srcIdx + 1);
              }
            }
          }
        }).catch(() => {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, params.name]);

  // 配置全局 Header
  const { setConfig } = useHeaderConfig();
  useEffect(() => {
    if (novelTitle) setConfig({ title: `${novelTitle} - ${branchInfo?.title || params.name} 分支`, backHref: `/novels/${params.id}` });
  }, [novelTitle, branchInfo, params.name, params.id, setConfig]);

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* 分支信息卡 */}
        <div className="card p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: 'rgba(16,185,129,0.12)' }}>
              🌿
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {branchInfo?.title || params.name}
                </h1>
                {/* 分支唯一编号 */}
                {branchInfo && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded shrink-0"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                    {sourceChapterOrder
                      ? `B${String(sourceChapterOrder).padStart(2, '0')}-${params.name.slice(0, 12)}`
                      : `B-${params.name.slice(0, 16)}`}
                  </span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                作者：{branchInfo?.author_name || 'AI'} · {chapters.length} 章 · {totalWords} 字
                {branchInfo?.created_at && ` · ${new Date(branchInfo.created_at).toLocaleDateString('zh-CN')}`}
              </p>
            </div>
          </div>

          {/* 分支来源信息 */}
          {branchInfo?.source_chapter_id && (
            <div className="flex flex-wrap gap-2 mb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                📍 源自
                {sourceChapterOrder ? (
                  <Link href={`/novels/${params.id}/${branchInfo.source_chapter_id}`}
                    className="font-medium underline underline-offset-2" style={{ color: 'var(--accent)' }}>
                    第{sourceChapterOrder}章
                  </Link>
                ) : (
                  <span className="font-medium">主线章节</span>
                )}
              </span>
              {branchInfo.source_choice_text && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  🎯 选择「{branchInfo.source_choice_text}」
                </span>
              )}
            </div>
          )}

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
              {chapters.map((chapter, index) => {
                const branchOrder = sourceChapterOrder
                  ? `${sourceChapterOrder}.${index + 1}`
                  : String(index + 1);
                return (
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {chapter.title}
                      </p>
                      <span className="text-xs font-mono shrink-0 px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '9px' }}>
                        B{sourceChapterOrder ? `${String(sourceChapterOrder).padStart(2,'0')}.${String(index+1).padStart(2,'0')}` : `-${String(index+1).padStart(2,'0')}`}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {chapter.word_count || 0} 字 · by {chapter.author_name || 'AI'}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                );
              })}
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
