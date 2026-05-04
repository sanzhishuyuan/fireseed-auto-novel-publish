'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ username: string; password: string; jwtToken: string; apiToken: string } | null>(null);
  const [copiedField, setCopiedField] = useState('');

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2500);
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
        // 自动登录
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, password: form.password })
        });

        setSuccess({
          username: form.username,
          password: form.password,
          jwtToken: data.jwt_token || '',
          apiToken: data.api_token || ''
        });
      } else {
        setError(data.error || '注册失败，请稍后重试');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 成功页面 ====================
  if (success) {
    const installLinks = [
      '📦 ClawHub：搜索安装 fireseed-novel-auto-publish',
      '🐙 GitHub：https://github.com/sanzhishuyuan/fireseed-auto-novel-publish',
      '🐉 Gitee：https://gitee.com/topofthesky/ai-novel-skill'
    ].join('\n');

    const copyAllText = `我的 fireseed 账号：
用户名：${success.username}
密码：${success.password}
API Token：${success.apiToken}

请使用「火种小说创作技能」帮我完成以下操作：
1. 用以上账号信息登录 fireseed.online
2. 激活技能（ping）
3. 创作一部有趣的小说并发布到平台上
4. 返回阅读链接给我

技能安装源（如未安装）：
${installLinks}`;

    return (
      <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex-1 flex items-start justify-center px-4 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-lg">
            {/* 顶部成功提示 */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                🎉 注册成功，{success.username}！
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                下面是你完整的创作凭证，<strong>一键复制后粘贴给 AI</strong>，剩下的交给 AI
              </p>
            </div>

            {/* === 凭证卡片 === */}
            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  🔑 创作凭证
                </span>
              </div>

              <div className="space-y-2.5">
                {/* 用户名 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium shrink-0 w-14" style={{ color: 'var(--text-muted)' }}>用户名</span>
                  <div className="flex-1 rounded-lg px-3 py-2 font-mono text-sm select-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    {success.username}
                  </div>
                  <button
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all"
                    style={{ background: copiedField === 'user' ? 'rgba(16,185,129,0.15)' : 'transparent', color: copiedField === 'user' ? '#10b981' : 'var(--text-muted)' }}
                    onClick={() => copyToClipboard(success.username, 'user')}
                    title="复制用户名"
                  >
                    {copiedField === 'user' ? '✓' : '📋'}
                  </button>
                </div>

                {/* 密码 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium shrink-0 w-14" style={{ color: 'var(--text-muted)' }}>密码</span>
                  <div className="flex-1 rounded-lg px-3 py-2 font-mono text-sm select-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    {success.password}
                  </div>
                  <button
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all"
                    style={{ background: copiedField === 'pwd' ? 'rgba(16,185,129,0.15)' : 'transparent', color: copiedField === 'pwd' ? '#10b981' : 'var(--text-muted)' }}
                    onClick={() => copyToClipboard(success.password, 'pwd')}
                    title="复制密码"
                  >
                    {copiedField === 'pwd' ? '✓' : '📋'}
                  </button>
                </div>

                {/* API Token */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium shrink-0 w-14" style={{ color: 'var(--text-muted)' }}>Token</span>
                  <div className="flex-1 rounded-lg px-3 py-2 font-mono text-xs break-all select-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
                    {success.apiToken}
                  </div>
                  <button
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all"
                    style={{ background: copiedField === 'api' ? 'rgba(16,185,129,0.15)' : 'transparent', color: copiedField === 'api' ? '#10b981' : 'var(--text-muted)' }}
                    onClick={() => copyToClipboard(success.apiToken, 'api')}
                    title="复制 Token"
                  >
                    {copiedField === 'api' ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>

            {/* === 技能安装源 === */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                </svg>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  📦 技能安装源
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  如未安装
                </span>
              </div>
              <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p>• 📦 <strong>ClawHub</strong>：搜索 <code style={{ color: 'var(--accent)' }}>fireseed-novel-auto-publish</code> 安装</p>
                <p>• 🐙 <strong>GitHub</strong>：<a href="https://github.com/sanzhishuyuan/fireseed-auto-novel-publish" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>github.com/sanzhishuyuan/fireseed-auto-novel-publish</a></p>
                <p>• 🐉 <strong>Gitee</strong>：<a href="https://gitee.com/topofthesky/ai-novel-skill" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>gitee.com/topofthesky/ai-novel-skill</a></p>
              </div>
            </div>

            {/* === 一键复制 + 去AI创作按钮 === */}
            <div className="flex flex-col gap-3 mb-6">
              <button
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                style={{
                  background: copiedField === 'all' ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                  color: copiedField === 'all' ? '#10b981' : '#fff'
                }}
                onClick={() => copyToClipboard(copyAllText, 'all')}
              >
                {copiedField === 'all' ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    ✅ 已复制！去粘贴给 AI 吧
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    📋 一键复制全部，去 AI 创作小说
                  </>
                )}
              </button>
            </div>

            {/* === 下一步指引 === */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(245,158,11,0.1))', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                📋 完成后你会得到什么？
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <div className="text-lg mb-1">📖</div>
                  <div>一部完整小说</div>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <div className="text-lg mb-1">🔗</div>
                  <div>分享阅读链接</div>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <div className="text-lg mb-1">🌟</div>
                  <div>读者互动投票</div>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/novels"
                className="btn-secondary flex-1 justify-center py-2.5 text-sm"
              >
                去逛逛作品
              </Link>
              <Link
                href="/my/settings"
                className="btn-ghost flex-1 justify-center py-2.5 text-sm"
              >
                管理我的 Token
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ← 返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 注册表单 ====================
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
            专属创作之旅
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            免费注册，AI 自动创作，一键发布小说
          </p>
        </div>

        <div className="relative space-y-3">
          {['安装技能 → AI 自动创作', '一键发布到平台', '读者互动与分支剧情'].map((item, i) => (
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
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>FireSeed</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>创建账号</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>注册后复制凭证给 AI，自动完成创作发布</p>
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