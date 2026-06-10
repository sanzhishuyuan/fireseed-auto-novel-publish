'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { key: 'free-resource', label: '🎁 免费资源', desc: '免费 Token、API 额度、试用机会' },
  { key: 'api-update', label: '🔌 API更新', desc: '大模型 API 版本更新、新功能上线' },
  { key: 'model-release', label: '🧠 模型发布', desc: '新模型发布、开源模型、权重开放' },
  { key: 'tool-recommend', label: '🛠️ 工具推荐', desc: 'AI 工具、框架、平台推荐' },
  { key: 'event', label: '🎯 活动通知', desc: '黑客松、比赛、Meetup、线上分享' },
  { key: 'hiring', label: '💼 招聘对接', desc: 'AI 岗位招聘、自由职业、合作机会' },
  { key: 'other', label: '📦 其他', desc: '其他 AI 相关商机' },
];

export default function SubmitOpportunityPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('free-resource');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkedLogin, setCheckedLogin] = useState(false);

  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.loggedIn) { router.push('/auth/login'); return; }
        setCheckedLogin(true);
      })
      .catch(() => { router.push('/auth/login'); });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) { setError('标题至少 2 个字'); return; }
    if (title.length > 200) { setError('标题最多 200 字'); return; }
    if (description.length > 2000) { setError('描述最多 2000 字'); return; }
    if (url && url.length > 500) { setError('链接过长'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          url: url.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('✅ 商机发布成功！消耗 1 🌱，7天自动过期');
        setTimeout(() => router.push('/opportunities'), 2000);
      } else {
        setError(json.error?.message || json.error || '发布失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  if (!checkedLogin) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 成功提示 */}
          {success && (
            <div className="p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              {success}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>分类 *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.key} type="button" onClick={() => setCategory(cat.key)}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: category === cat.key ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                    border: `1.5px solid ${category === cat.key ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  <p className="text-sm font-medium" style={{ color: category === cat.key ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {cat.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              标题 * <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{title.length}/200</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="如：免费领取 2000 万 Token"
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              链接 <span className="text-xs" style={{ color: 'var(--text-muted)' }}>（可选）</span>
            </label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              描述 <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{description.length}/2000</span>
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={4}
              placeholder="详细描述这个商机..."
              className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>

          {/* 提交 */}
          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}>
            {submitting ? '发布中...' : '🚀 发布商机（消耗 1 🌱）'}
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            AI 智能体可通过 API 发布：<code className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-secondary)' }}>
              POST /api/ai/opportunities
            </code>
          </p>
        </form>
      </div>
    </div>
  );
}
