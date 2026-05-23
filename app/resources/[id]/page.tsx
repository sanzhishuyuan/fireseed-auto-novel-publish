'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Resource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  tags: string;
  provider_id: string | null;
  provider_name: string;
  status: string;
  useful_count: number;
  useless_count: number;
  verified_count: number;
  created_at: string;
  user_vote: string | null;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'ai-tool': '🤖',
  'ai-coding': '💻',
  'ai-image': '🎨',
  'ai-video': '🎬',
  'ai-api': '🔌',
  'ai-data': '📊',
  'dev-tools': '🛠️',
  'other': '📦',
};

const CATEGORY_LABELS: Record<string, string> = {
  'ai-tool': 'AI 对话',
  'ai-coding': 'AI 编程',
  'ai-image': 'AI 图像',
  'ai-video': 'AI 视频',
  'ai-api': 'API 平台',
  'ai-data': '数据训练',
  'dev-tools': '开发工具',
  'other': '其他资源',
};

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/resources/${params.id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setResource(json.data);
        } else {
          setError('资源不存在');
        }
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user) {
          setUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

  const handleVote = async (vote: 'useful' | 'useless') => {
    if (!user || voting) return;
    setVoting(true);

    try {
      const res = await fetch(`/api/resources/${params.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
        credentials: 'include',
      });

      const json = await res.json();
      if (json.success) {
        setResource(prev => prev ? {
          ...prev,
          useful_count: json.data.useful_count,
          useless_count: json.data.useless_count,
          user_vote: json.data.user_vote,
        } : prev);
      }
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-24 rounded" style={{ background: 'var(--bg-secondary)' }} />
            <div className="h-8 rounded w-2/3" style={{ background: 'var(--bg-secondary)' }} />
            <div className="h-4 rounded w-1/3" style={{ background: 'var(--bg-secondary)' }} />
            <div className="h-20 rounded" style={{ background: 'var(--bg-secondary)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <span className="text-3xl">😢</span>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{error || '资源不存在'}</h2>
          <Link href="/resources" className="btn-primary text-sm">
            返回资源库
          </Link>
        </div>
      </div>
    );
  }

  const emoji = CATEGORY_EMOJIS[resource.category] || '📦';
  const totalVotes = resource.useful_count + resource.useless_count;
  const usefulness = totalVotes > 0 ? Math.round((resource.useful_count / totalVotes) * 100) : 0;
  const tags = resource.tags ? resource.tags.split(',').filter(Boolean) : [];
  const createdDate = resource.created_at ? new Date(resource.created_at).toLocaleDateString('zh-CN') : '未知';

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/resources" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 8H3M7 4L3 8l4 4"/>
              </svg>
            </Link>
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>资源详情</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="card overflow-hidden">
          {/* 头部：图标 + 标题 */}
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: 'var(--accent-glow)' }}>
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {resource.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                    {emoji} {CATEGORY_LABELS[resource.category] || resource.category}
                  </span>
                  {resource.status === 'verified' && (
                    <span className="badge badge-success">已验证</span>
                  )}
                </div>
              </div>
            </div>

            {/* URL */}
            <div className="mb-6">
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-80"
                style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 3H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9M9 1h4v4M5 9l6-6"/>
                </svg>
                <span className="truncate max-w-md">{resource.url}</span>
              </a>
            </div>

            {/* 描述 */}
            {resource.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>描述</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {resource.description}
                </p>
              </div>
            )}

            {/* 标签 */}
            {tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>标签</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 提交信息 */}
            <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>
                  提交者: <span style={{ color: 'var(--text-secondary)' }}>{resource.provider_name || '匿名'}</span>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  添加日期: <span style={{ color: 'var(--text-secondary)' }}>{createdDate}</span>
                </span>
              </div>
            </div>

            {/* 投票区域 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>有用性评分</h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1" style={{ color: '#10b981' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 7l4-5 3 3L11 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7z"/>
                      </svg>
                      有用 ({resource.useful_count})
                    </span>
                    <span className="flex items-center gap-1" style={{ color: '#ef4444' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M11 5L7 10 4 7 1 11V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1z"/>
                      </svg>
                      无用 ({resource.useless_count})
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${usefulness}%`,
                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    总票数: {totalVotes} · 有用率: <span className="font-medium" style={{ color: usefulness >= 80 ? '#10b981' : 'var(--text-primary)' }}>{usefulness}%</span>
                    · 验证次数: {resource.verified_count}
                  </p>
                </div>
              </div>

              {/* 投票按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleVote('useful')}
                  disabled={!user || voting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    background: resource.user_vote === 'useful' ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)',
                    color: resource.user_vote === 'useful' ? '#10b981' : 'var(--text-secondary)',
                    border: resource.user_vote === 'useful' ? '1px solid #10b981' : '1px solid var(--border)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill={resource.user_vote === 'useful' ? '#10b981' : 'none'} stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 10l5-6 3 3L14 2v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V10z"/>
                  </svg>
                  有用
                </button>
                <button
                  onClick={() => handleVote('useless')}
                  disabled={!user || voting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    background: resource.user_vote === 'useless' ? 'rgba(239,68,68,0.15)' : 'var(--bg-secondary)',
                    color: resource.user_vote === 'useless' ? '#ef4444' : 'var(--text-secondary)',
                    border: resource.user_vote === 'useless' ? '1px solid #ef4444' : '1px solid var(--border)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill={resource.user_vote === 'useless' ? '#ef4444' : 'none'} stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 6L10 11 7 8 2 14V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1z"/>
                  </svg>
                  无用
                </button>
                {!user && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Link href="/auth/login" style={{ color: 'var(--accent)' }}>登录</Link> 后可以投票
                  </span>
                )}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
              <Link href="/resources" className="btn-ghost text-sm">
                返回列表
              </Link>
              <Link href="/resources/submit" className="btn-primary text-sm ml-auto">
                提交资源
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
