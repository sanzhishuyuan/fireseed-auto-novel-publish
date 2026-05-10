'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * 全局底部悬浮点赞栏
 * 自动识别小说页面（/novels/[id] 或 /novels/[id]/[chapterId]）
 * 提取 novelId 后显示点赞按钮
 */
export default function GlobalLikeBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [novelId, setNovelId] = useState('');
  const [novelTitle, setNovelTitle] = useState('');
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [likeMessage, setLikeMessage] = useState('');

  // 从 URL 提取 novelId
  useEffect(() => {
    const match = pathname.match(/^\/novels\/([^/]+)/);
    if (match) {
      setNovelId(match[1]);
      // 获取小说标题
      fetch(`/api/novels/${match[1]}`)
        .then(r => r.json())
        .then(d => { if (d.success) setNovelTitle(d.data.title); })
        .catch(() => {});
      // 获取点赞数
      fetch(`/api/novels/${match[1]}/like`)
        .then(r => r.json())
        .then(d => { if (d.success) setLikeCount(d.total_likes); })
        .catch(() => {});
    } else {
      setNovelId('');
      setNovelTitle('');
    }
  }, [pathname]);

  // 获取用户和余额
  useEffect(() => {
    if (!novelId) return;
    fetch('/api/user/me', { credentials: 'include' })
      .then(r => r.json())
      .then(async data => {
        if (data.loggedIn && data.user) {
          setUser(data.user);
          fetch('/api/seed/balance', { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setUserBalance(d.balance); })
            .catch(() => {});
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [novelId]);

  // 不在小说页面不显示
  if (!novelId) return null;

  const handleLike = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (likeLoading) return;
    if (userBalance < 1) {
      setLikeMessage('🌱 余额不足');
      setTimeout(() => setLikeMessage(''), 2500);
      return;
    }
    setLikeLoading(true);
    setLikeMessage('');
    try {
      const res = await fetch(`/api/novels/${novelId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setLikeCount(data.total_likes);
        setUserBalance(data.balance);
        setLikeMessage('👍 +1');
        setTimeout(() => setLikeMessage(''), 2000);
      } else if (data.error) {
        setLikeMessage(data.error);
        if (data.balance !== undefined) setUserBalance(data.balance);
        setTimeout(() => setLikeMessage(''), 2500);
      }
    } catch {
      setLikeMessage('点赞失败');
      setTimeout(() => setLikeMessage(''), 2500);
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-3 sm:pb-4 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl shadow-lg"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* 小说名（桌面端） */}
        {novelTitle && (
          <span className="hidden sm:block text-xs truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
            {novelTitle}
          </span>
        )}

        {/* 点赞按钮 */}
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            color: '#fff',
          }}
        >
          <span className="text-lg leading-none">{likeLoading ? '⏳' : '👍'}</span>
          <span className="font-semibold">{likeCount}</span>
          <span className="hidden sm:inline text-xs opacity-80">点赞</span>
        </button>

        {/* 消息提示 */}
        {likeMessage && (
          <span className="text-xs font-medium animate-pulse whitespace-nowrap" style={{ color: 'var(--accent)' }}>
            {likeMessage}
          </span>
        )}

        {/* 余额 */}
        {user && (
          <div className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
            <span>🌱</span>
            <span className="font-medium" style={{ color: userBalance > 0 ? 'var(--text-primary)' : '#ef4444' }}>
              {userBalance}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
