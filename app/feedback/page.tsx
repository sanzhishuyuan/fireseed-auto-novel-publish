'use client';

import { useState } from 'react';
import Link from 'next/link';

const FEEDBACK_TYPES = [
  { value: 'bug', label: '🐛 Bug 报告', desc: '遇到页面错误、功能失效等问题' },
  { value: 'feature', label: '💡 功能建议', desc: '有新想法或改进建议' },
  { value: 'question', label: '❓ 使用疑问', desc: '使用过程中有疑问需要帮助' },
  { value: 'other', label: '📝 其他反馈', desc: '其他任何想告诉我们的' },
] as const;

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function FeedbackPage() {
  const [type, setType] = useState('other');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: title.trim(), message: message.trim(), contact: contact.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
      } else {
        setError(data.error || '提交失败');
        setStatus('error');
      }
    } catch {
      setError('网络错误，请稍后重试');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>感谢您的反馈！</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>我们已收到您的意见，会尽快处理。您的每一条反馈都在帮助我们变得更好。</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => { setStatus('idle'); setTitle(''); setMessage(''); setContact(''); setType('other'); }} className="btn-primary px-6 py-3">
              继续反馈
            </button>
            <Link href="/" className="btn-secondary px-6 py-3">返回首页</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="url(#grad)"/>
              <path d="M8 14C8 14 10 8 14 8C18 8 20 14 20 14C20 14 18 20 14 20C10 20 8 14 8 14Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="14" cy="14" r="3" fill="white"/>
              <defs><linearGradient id="grad" x1="0" y1="0" x2="28" y2="28"><stop offset="0%" stopColor="var(--accent)"/><stop offset="100%" stopColor="var(--accent-light)"/></linearGradient></defs>
            </svg>
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>FireSeed</span>
          </Link>
          <Link href="/" className="btn-ghost text-sm">← 返回首页</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>给我们反馈</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>您的每一条建议和反馈，都在帮助我们做得更好</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 反馈类型 */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>反馈类型</label>
            <div className="grid grid-cols-2 gap-3">
              {FEEDBACK_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setType(ft.value)}
                  className={`p-3 rounded-xl text-left transition-all duration-200 ${
                    type === ft.value
                      ? 'ring-2 ring-offset-2'
                      : 'hover:scale-[1.02]'
                  }`}
                  style={{
                    background: type === ft.value ? 'var(--accent-glow)' : 'var(--bg-card)',
                    border: type === ft.value
                      ? '1px solid var(--accent)'
                      : '1px solid var(--border-light)',
                    '--tw-ring-color': 'var(--accent)',
                  } as React.CSSProperties}
                >
                  <p className="text-sm font-medium mb-0.5" style={{ color: type === ft.value ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {ft.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ft.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              placeholder="用一句话概括您的问题或建议"
              maxLength={200}
              required
            />
          </div>

          {/* 详细描述 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              详细描述 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input w-full min-h-[160px] resize-y"
              placeholder={
                type === 'bug' ? '请描述您遇到的具体问题：\n1. 发生了什么？\n2. 期望的结果是什么？\n3. 如何复现？' :
                type === 'feature' ? '请描述您期望的功能：\n1. 这个功能解决什么问题？\n2. 您设想的实现方式？' :
                '请详细描述您的问题或想法...'
              }
              maxLength={5000}
              required
            />
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{message.length}/5000</p>
          </div>

          {/* 联系方式 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              联系方式 <span className="text-xs" style={{ color: 'var(--text-muted)' }}>（选填，邮箱/QQ/微信）</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="input w-full"
              placeholder="方便我们与您联系，告知处理结果"
              maxLength={200}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 rounded-lg text-sm text-center" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {status === 'loading' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}></span>
                提交中...
              </span>
            ) : '提交反馈'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            也可以发送邮件至 <a href="mailto:suttangle@yeah.net" className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>suttangle@yeah.net</a>
          </p>
        </div>
      </div>
    </div>
  );
}
