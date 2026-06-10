'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORY_OPTIONS = [
  { value: '', label: '请选择分类' },
  { value: 'ai-tool', label: '🤖 AI 对话/写作' },
  { value: 'ai-coding', label: '💻 AI 编程' },
  { value: 'ai-image', label: '🎨 AI 图像/设计' },
  { value: 'ai-video', label: '🎬 AI 视频/音频' },
  { value: 'ai-api', label: '🔌 AI API/平台' },
  { value: 'ai-data', label: '📊 数据/训练' },
  { value: 'dev-tools', label: '🛠️ 开发工具' },
  { value: 'other', label: '📦 其他' },
];

export default function SubmitResourcePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    url: '',
    category: '',
    description: '',
    tags: '',
  });

  // 登录检查
  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user) {
          setUser(data.user);
        } else {
          router.push('/auth/login?redirect=/resources/submit');
        }
      })
      .catch(() => {
        router.push('/auth/login?redirect=/resources/submit');
      })
      .finally(() => setCheckingAuth(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 前端验证
    if (!form.title.trim()) {
      setError('请输入资源标题');
      return;
    }
    if (!form.url.trim()) {
      setError('请输入资源 URL');
      return;
    }
    if (!form.category) {
      setError('请选择资源分类');
      return;
    }
    if (form.description.length > 500) {
      setError('描述不能超过 500 字');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          url: form.url.trim(),
          category: form.category,
          description: form.description.trim() || null,
          tags: form.tags.trim(),
        }),
        credentials: 'include',
      });

      const json = await res.json();

      if (json.success) {
        setSuccess('资源提交成功！审核通过后将展示在资源库中。');
        setForm({ title: '', url: '', category: '', description: '', tags: '' });
        setTimeout(() => {
          router.push('/resources');
        }, 2000);
      } else {
        setError(json.error?.message || '提交失败，请稍后重试');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-pulse text-sm" style={{ color: 'var(--text-muted)' }}>验证登录状态...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            📝 提交新的可信资源
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            分享你发现的好用 AI 工具或平台，审核通过后将展示在资源库中
          </p>

          {success && (
            <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 9l3 3 5-5M9 17A8 8 0 1 1 9 1a8 8 0 0 1 0 16z"/>
                </svg>
                {success}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 6v4M9 13v.01M9 17A8 8 0 1 1 9 1a8 8 0 0 1 0 16z"/>
                </svg>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                资源标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="input"
                placeholder="例如：ChatGPT、GitHub Copilot"
                required
                maxLength={100}
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                资源 URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                className="input"
                placeholder="https://..."
                required
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                请输入资源的官网链接，确保链接有效
              </p>
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                资源分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="input"
                required
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                资源描述
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="input"
                rows={4}
                placeholder="简要描述这个资源的功能和特点..."
                maxLength={500}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  简洁清晰地描述资源价值
                </p>
                <span className="text-xs" style={{ color: form.description.length > 500 ? '#ef4444' : 'var(--text-muted)' }}>
                  {form.description.length}/500
                </span>
              </div>
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                标签
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                className="input"
                placeholder="例如：聊天,写作,国产（逗号分隔）"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                多个标签用逗号分隔，帮助其他用户搜索
              </p>
            </div>

            {/* 提交按钮 */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-6 py-3 justify-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="30" />
                    </svg>
                    提交中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
                    </svg>
                    提交资源
                  </>
                )}
              </button>
              <Link href="/resources" className="btn-ghost text-sm">
                取消
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
