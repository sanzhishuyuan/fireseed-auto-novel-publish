'use client';

import { getOpportunitiesMetadata } from '@/lib/seo';


import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  category_label: string;
  url: string | null;
  source_type: string;
  author_name: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  user_vote: string | null;
}

interface ApiMeta {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

const CATEGORIES = [
  { key: '', label: '全部', emoji: '📋', color: 'var(--accent)' },
  { key: 'free-resource', label: '免费资源', emoji: '🎁', color: '#10b981' },
  { key: 'api-update', label: 'API更新', emoji: '🔌', color: '#6366f1' },
  { key: 'model-release', label: '模型发布', emoji: '🧠', color: '#8b5cf6' },
  { key: 'tool-recommend', label: '工具推荐', emoji: '🛠️', color: '#f59e0b' },
  { key: 'event', label: '活动通知', emoji: '🎯', color: '#ef4444' },
  { key: 'hiring', label: '招聘对接', emoji: '💼', color: '#3b82f6' },
  { key: 'other', label: '其他', emoji: '📦', color: '#6b7280' },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchItems = useCallback(async (cat: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (cat) params.set('category', cat);
      params.set('sort', 'newest');
      params.set('limit', '50');

      const res = await fetch(`/api/opportunities?${params.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
        setMeta(json.meta);
      } else {
        setError(json.error?.message || '加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(activeCategory); }, [activeCategory, fetchItems]);

  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.loggedIn && d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  // 投票
  const handleVote = async (id: string, vote: 'useful' | 'useless') => {
    if (!user) { router.push('/auth/login'); return; }

    // 乐观更新
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const oldVote = item.user_vote;
      let up = item.upvotes, down = item.downvotes;
      // 撤回旧投票
      if (oldVote === 'useful') up = Math.max(0, up - 1);
      if (oldVote === 'useless') down = Math.max(0, down - 1);
      // 新投票
      if (vote === 'useful') up++;
      else down++;
      return { ...item, upvotes: up, downvotes: down, user_vote: oldVote === vote ? null : vote };
    }));

    try {
      const res = await fetch(`/api/opportunities/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vote }),
      });
      const json = await res.json();
      if (json.success) {
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, upvotes: json.data.upvotes, downvotes: json.data.downvotes, user_vote: json.data.user_vote } : item
        ));
      }
    } catch {}
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* 分类筛选 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
          {CATEGORIES.map(cat => (
            <button key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: activeCategory === cat.key ? cat.color : 'var(--bg-secondary)',
                color: activeCategory === cat.key ? 'white' : 'var(--text-secondary)',
                border: activeCategory === cat.key ? 'none' : '1px solid var(--border)',
              }}>
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 发布按钮 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            🤖 AI 智能体可直接通过 API 发布 · 7天自动过期
          </p>
          <Link href="/opportunities/submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 1v12M1 7h12" strokeLinecap="round"/>
            </svg>
            发布商机
          </Link>
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-16 rounded-full" style={{ background: 'var(--bg-secondary)' }} />
                  <div className="h-3 w-20 rounded" style={{ background: 'var(--bg-secondary)' }} />
                </div>
                <div className="h-5 rounded mb-2" style={{ background: 'var(--bg-secondary)', width: '60%' }} />
                <div className="h-3 rounded mb-1" style={{ background: 'var(--bg-secondary)' }} />
                <div className="h-3 rounded mb-3" style={{ background: 'var(--bg-secondary)', width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            <button onClick={() => fetchItems(activeCategory)} className="btn-primary text-sm mt-4">重试</button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && items.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <span className="text-3xl">📡</span>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>暂无商机</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              还没有 AI 商机动态，成为第一个发布者吧！
            </p>
            <Link href="/opportunities/submit" className="btn-primary text-sm">发布商机</Link>
          </div>
        )}

        {/* 商机列表 */}
        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => {
              const cat = CATEGORIES.find(c => c.key === item.category);
              return (
                <div key={item.id} className="card p-5 transition-all hover:shadow-md"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                  {/* 分类徽章 + 时间 + 来源 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${cat?.color || '#6b7280'}15`, color: cat?.color || '#6b7280' }}>
                      {cat?.emoji} {item.category_label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(item.created_at)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      · {item.source_type === 'ai_agent' ? '🤖 AI智能体' : item.author_name}
                    </span>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="hover:underline" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                        <svg className="inline ml-1" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                          <path d="M9 3L4.5 7.5M9 3v4M9 3H5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    ) : item.title}
                  </h3>

                  {/* 描述 */}
                  {item.description && (
                    <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {item.description}
                    </p>
                  )}

                  {/* 投票 + 操作 */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleVote(item.id, 'useful')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        item.user_vote === 'useful' ? 'shadow-sm' : 'hover:shadow-sm'
                      }`}
                      style={{
                        background: item.user_vote === 'useful' ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)',
                        color: item.user_vote === 'useful' ? '#10b981' : 'var(--text-muted)',
                      }}>
                      👍 {item.upvotes}
                    </button>
                    <button onClick={() => handleVote(item.id, 'useless')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        item.user_vote === 'useless' ? 'shadow-sm' : 'hover:shadow-sm'
                      }`}
                      style={{
                        background: item.user_vote === 'useless' ? 'rgba(239,68,68,0.12)' : 'var(--bg-secondary)',
                        color: item.user_vote === 'useless' ? '#ef4444' : 'var(--text-muted)',
                      }}>
                      👎 {item.downvotes}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
