'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ username: string; jwtToken: string; apiToken: string } | null>(null);
  const [copiedField, setCopiedField] = useState('');

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch { /* 忽略 */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    if (form.password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (form.username.length < 3) {
      setError('用户名至少3位');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password })
      });

      const data = await res.json();

      if (res.ok) {
        // 自动登录：设置 cookie（JWT）
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, password: form.password })
        });

        if (loginRes.ok) {
          setSuccess({
            username: form.username,
            jwtToken: data.jwt_token || '',
            apiToken: data.api_token || ''
          });
        } else {
          setSuccess({
            username: form.username,
            jwtToken: data.jwt_token || '',
            apiToken: data.api_token || ''
          });
        }
      } else {
        setError(data.error || '注册失败，请稍后重试');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 成功页面
  if (success) {
    return (
      <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
          <div className="w-full max-w-lg">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                🎉 注册成功，{success.username}！
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                下面是你专属的 API Token，<strong>复制后告诉 AI</strong> 即可开始创作
              </p>
            </div>

            {/* API Token 展示 */}
            <div
              className="rounded-xl p-5 mb-6"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  🔑 你的 API Token
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                >
                  复制给 AI 用
                </span>
              </div>
              <div
                className="relative rounded-lg p-3 font-mono text-xs break-all select-all cursor-pointer"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent)' }}
                onClick={() => copyToClipboard(success.apiToken, 'api')}
              >
                {success.apiToken}
                <button
                  className="absolute top-2 right-2 px-2 py-1 rounded text-xs transition-all"
                  style={{
                    background: copiedField === 'api' ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)',
                    color: copiedField === 'api' ? '#10b981' : 'var(--text-muted)'
                  }}
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(success.apiToken, 'api'); }}
                >
                  {copiedField === 'api' ? '✅ 已复制' : '📋 复制'}
                </button>
              </div>
            </div>

            {/* JWT Token（高级） */}
            <details className="mb-6">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                🔧 高级：JWT Token（有效期 30 天，用于网页登录）
              </summary>
              <div
                className="mt-2 rounded-lg p-3 font-mono text-xs break-all"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {success.jwtToken}
              </div>
            </details>

            {/* 下一步指引 */}
            <div
              className="rounded-xl p-5 mb-6"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(245,158,11,0.1))', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                📋 下一步做什么？
              </h3>
              <ol className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li className="flex gap-2">
                  <span className="font-bold shrink-0" style={{ color: 'var(--accent)' }}>1.</span>
                  <span><strong>复制上面的 API Token</strong>（已帮你选中）</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold shrink-0" style={{ color: 'var(--accent)' }}>2.</span>
                  <span>告诉你的 AI：「<strong>我有一个 fireseed API Token，帮我创作一部小说</strong>」</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold shrink-0" style={{ color: 'var(--accent)' }}>3.</span>
                  <span>把 Token 发给 AI，剩下的自动完成 ✨</span>
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/novels')}
                className="btn-primary flex-1 justify-center py-2.5"
              >
                去逛逛作品
              </button>
              <button
                onClick={() => { setSuccess(null); setForm({ username: '', password: '', confirmPassword: '' }); }}
                className="btn-secondary flex-1 justify-center py-2.5"
              >
                注册新账号
              </button>
            </div>

            <div className="mt-6 text-center">
              <Link href="/" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ← 返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* 左侧装饰 */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #5c3d1e 0%, #8b5e3c 50%, #c49a6c 100%)' }}
      >
        <div className="absolute top-10 left-10 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: 'white' }} />
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--accent-light)' }} />

        <div className="relative flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill="rgba(255,255,255,0.15)"/>
            <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="white" strokeWidth="1.5" fill="none"/>
            <circle cx="18" cy="18" r="4" fill="white"/>
          </svg>
          <span className="text-xl font-semibold text-white">Spark</span>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
            开启你的<br />
            专属阅读之旅
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            免费注册，解锁分支剧情，体验完整故事世界
          </p>
        </div>

        <div className="relative space-y-3">
          {['免费阅读主线章节', '解锁分支剧情', '收藏阅读进度'].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-white/70 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧表单 */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="var(--accent-glow)"/>
              <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
              <circle cx="18" cy="18" r="4" fill="var(--accent)"/>
            </svg>
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Spark</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>创建账号</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>注册后立即开始阅读体验</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                用户名
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input"
                placeholder="3-20位字母或数字"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                密码
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="至少6位"
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                确认密码
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="input"
                placeholder="再次输入密码"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div
                className="p-3 rounded-lg text-sm flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4h2v5H7V4zm0 6h2v2H7v-2z"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
                  </svg>
                  注册中...
                </span>
              ) : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            已有账号？{' '}
            <Link href="/auth/login" className="font-medium" style={{ color: 'var(--accent)' }}>
              立即登录
            </Link>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
