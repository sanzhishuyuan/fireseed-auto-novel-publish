'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

const C = {
  bg: '#0b0b0f',
  card: '#131318',
  text: '#f0ece4',
  dim: '#9a9a8e',
  muted: '#5a5a52',
  gold: '#c9a55c',
  red: '#ef4444',
  border: 'rgba(255,255,255,0.06)',
};

const TYPE_ICONS: Record<string, string> = {
  system: '🔔',
  garbled_data: '⚠️',
  admin: '📢',
  update: '🔄',
  task: '📋',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // 未读计数轮询
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setUnreadCount(data.data.count);
      }
    } catch {}
  }, []);

  // 打开时获取完整列表
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        fetch('/api/notifications?limit=20'),
        fetch('/api/notifications/unread-count'),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        if (data.success) setNotifications(data.data.notifications);
      }
      if (countRes.ok) {
        const data = await countRes.json();
        if (data.success) setUnreadCount(data.data.count);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  // 首次加载及定时刷新
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // 30秒轮询
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 10,
          border: 'none',
          background: 'var(--accent-glow)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: 'var(--accent)',
        }}
        aria-label={`通知${unreadCount > 0 ? `（${unreadCount}条未读）` : ''}`}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: C.red,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 100,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              通知
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: 12,
                  color: C.gold,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                全部已读
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            {loading && notifications.length === 0 && (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  color: C.muted,
                  fontSize: 13,
                }}
              >
                加载中...
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  color: C.muted,
                  fontSize: 13,
                }}
              >
                暂无通知
              </div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  background: n.is_read ? 'transparent' : 'rgba(201,165,92,0.04)',
                  cursor: n.link ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (!n.is_read) handleMarkRead(n.id);
                  if (n.link) window.location.href = n.link;
                }}
              >
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {TYPE_ICONS[n.type] || '🔔'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: n.is_read ? 400 : 600,
                          color: C.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: C.gold,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 12,
                        color: C.dim,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {n.content}
                    </p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 11,
                        color: C.muted,
                      }}
                    >
                      {formatTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
