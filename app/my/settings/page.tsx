'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Profile {
  id: string;
  username: string;
  nickname: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tokens, setTokens] = useState<{ id: string; token: string; name: string; created_at: string; last_used: string | null }[]>([]);
  const [copiedToken, setCopiedToken] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/ai/token');
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch {}
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(id);
      setTimeout(() => setCopiedToken(''), 2000);
    } catch {}
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/me', { credentials: 'include' });
      const data = await res.json();
      if (!data.loggedIn) {
        router.push('/auth/login');
        return;
      }
      setProfile(data.user);
      setNickname(data.user.nickname || data.user.username);
    } catch {
      setMessage({ type: 'error', text: '加载失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      setMessage({ type: 'error', text: '昵称不能为空' });
      return;
    }
    if (nickname.trim().length > 30) {
      setMessage({ type: 'error', text: '昵称不能超过30个字符' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: '昵称修改成功' });
        // 更新本地显示
        if (profile) {
          setProfile({ ...profile, nickname: nickname.trim() });
        }
      } else {
        setMessage({ type: 'error', text: data.error || '修改失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
          </svg>
          <span style={{ color: 'var(--text-secondary)' }}>加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>个人设置</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>管理你的个人资料和偏好</p>
      </div>

      {/* 基本信息 */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--text-primary)' }}>
          基本信息
        </h2>

        {/* 头像占位 */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white' }}
          >
            {(profile?.nickname || profile?.username || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {profile?.nickname || profile?.username}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              @{profile?.username} · {profile?.role === 'admin' ? '管理员' : '普通用户'}
            </p>
          </div>
        </div>

        {/* 昵称编辑 */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            显示昵称
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input flex-1"
              placeholder="输入你的昵称"
              maxLength={30}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-6 py-2 text-sm"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            昵称将代替用户名在网站上显示，1-30个字符
          </p>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className="mt-4 p-3 rounded-lg text-sm flex items-center gap-2"
            style={{
              background: message.type === 'success'
                ? 'rgba(16,185,129,0.08)'
                : 'rgba(239,68,68,0.08)',
              color: message.type === 'success' ? '#10b981' : '#ef4444'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              {message.type === 'success' ? (
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.36 5.36l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 01.7-.7L7 9.29l3.65-3.65a.5.5 0 01.7.7z"/>
              ) : (
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4h2v5H7V4zm0 6h2v2H7v-2z"/>
              )}
            </svg>
            {message.text}
          </div>
        )}
      </div>

      {/* 账户信息 */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--text-primary)' }}>
          账户信息
        </h2>
        <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex justify-between">
            <span>用户名</span>
            <span style={{ color: 'var(--text-primary)' }}>{profile?.username}</span>
          </div>
          <div className="flex justify-between">
            <span>角色</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {profile?.role === 'admin' ? '管理员' : '普通用户'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>注册时间</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleString('zh-CN') : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* API Token（用于 AI 创作） */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            🔑 API Token
          </h2>
          <Link
            href="/my/tokens"
            className="text-xs underline underline-offset-2"
            style={{ color: 'var(--accent)' }}
          >
            管理 Token
          </Link>
        </div>

        {tokens.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            暂无 Token。注册账号时会自动生成一个 Token。
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map((t) => (
              <div key={t.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {t.name} · 创建于 {new Date(t.created_at).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.last_used ? `最后使用: ${new Date(t.last_used).toLocaleDateString('zh-CN')}` : '从未使用'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 rounded-lg px-3 py-2 font-mono text-xs break-all select-all"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--accent)' }}
                  >
                    {t.token}
                  </div>
                  <button
                    className="shrink-0 px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      background: copiedToken === t.id ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)',
                      color: copiedToken === t.id ? '#10b981' : 'var(--text-muted)'
                    }}
                    onClick={() => copyToClipboard(t.token, t.id)}
                  >
                    {copiedToken === t.id ? '✓ 已复制' : '📋 复制'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', color: 'var(--text-muted)' }}>
          💡 API Token 用于 AI 创作。复制后发给 AI，AI 用它登录并发布作品到你的账号。
          <br />
          如果 Token 泄露，可以在 <Link href="/my/tokens" style={{ color: 'var(--accent)' }}>Token 管理页</Link> 删除重建。
        </div>
      </div>
    </div>
  );
}
