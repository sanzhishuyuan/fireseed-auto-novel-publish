'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface User {
  userId: string;
  username: string;
  nickname?: string;
}

interface Room {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

interface Message {
  id: string;
  room_id: string;
  user_id: string | null;
  username: string;
  content: string;
  is_ai: number;
  reply_to: string | null;
  created_at: string;
}

export default function ChatRoom({ user, rooms }: { user: User | null; rooms: Room[] }) {
  const [activeRoom, setActiveRoom] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string>('');

  // 加载初始消息
  const loadMessages = useCallback(async (room: string, beforeId?: string) => {
    try {
      const url = beforeId
        ? `/api/chat/messages?room=${room}&before=${beforeId}&limit=50`
        : `/api/chat/messages?room=${room}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        if (beforeId) {
          setMessages(prev => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
          if (data.messages.length > 0) {
            lastMsgIdRef.current = data.messages[data.messages.length - 1].id;
          }
        }
        setHasMore(data.hasMore);
      }
    } catch (e) {
      console.error('加载消息失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setHasMore(true);
    loadMessages(activeRoom);

    // SSE 连接
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      const after = lastMsgIdRef.current;
      const url = `/api/chat/messages/stream?room=${activeRoom}${after ? `&after=${after}` : ''}`;
      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message') {
            const msg = data.message as Message;
            setMessages(prev => {
              // 避免重复
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            lastMsgIdRef.current = msg.id;
          }
        } catch { /* ignore parse errors */ }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        // 自动重连
        reconnectTimer = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [activeRoom, loadMessages]);

  // 自动滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 加载更多（滚动到顶部时）
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const oldestMsg = messages[0];
          if (oldestMsg) {
            loadMessages(activeRoom, oldestMsg.id);
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [messages, hasMore, loading, activeRoom, loadMessages]);

  // 发送消息
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !user) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: activeRoom, content: text }),
      });

      const data = await res.json();
      if (data.success) {
        setInputText('');
      } else {
        setError(data.error || '发送失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setSending(false);
    }
  };

  // 键盘发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 格式化时间
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const displayName = user?.nickname || user?.username || '';

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {/* 左侧房间列表 */}
      <div className="md:col-span-1 space-y-2">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>聊天室</h2>
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => setActiveRoom(room.id)}
            className={`w-full text-left p-3 rounded-xl transition-all ${
              activeRoom === room.id
                ? 'shadow-sm' 
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              background: activeRoom === room.id ? 'var(--bg-card)' : 'transparent',
              border: activeRoom === room.id ? '1px solid var(--border-light)' : '1px solid transparent',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{room.icon}</span>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {room.name}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {room.desc}
                </div>
              </div>
            </div>
          </button>
        ))}

        <div className="mt-6 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            🤖 <strong>AI助手</strong> 会在这里和大家聊天！
            <br />
            可以问小说剧情、求推荐、聊创作。
          </p>
        </div>
      </div>

      {/* 右侧消息区域 */}
      <div className="md:col-span-3">
        <div
          className="rounded-xl overflow-hidden border"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-light)',
          }}
        >
          {/* 房间标题 */}
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-light)' }}>
            <span className="text-lg">{rooms.find(r => r.id === activeRoom)?.icon}</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {rooms.find(r => r.id === activeRoom)?.name}
            </span>
          </div>

          {/* 消息列表 */}
          <div className="h-[500px] overflow-y-auto px-5 py-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
            {/* 顶部加载更多指示器 */}
            <div ref={loadMoreRef} className="text-center text-xs py-2" style={{ color: 'var(--text-muted)' }}>
              {hasMore ? '↑ 加载更多' : '— 没有更多消息 —'}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>还没有消息，来发第一条吧！</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAI = msg.is_ai === 1;
                const isMe = !isAI && msg.user_id === user?.userId;

                return (
                  <div key={msg.id} className={`flex gap-2.5 ${isAI ? '' : ''}`}>
                    {/* 头像 */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isAI
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                          : isMe
                            ? '' : ''
                      }`}
                      style={!isAI ? {
                        background: isMe ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                        color: isMe ? 'var(--accent)' : 'var(--text-muted)',
                      } : {}}
                    >
                      {isAI ? '🤖' : (msg.username.charAt(0).toUpperCase())}
                    </div>

                    {/* 消息内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color: isAI ? '#ea580c' : isMe ? 'var(--accent)' : 'var(--text-primary)',
                          }}
                        >
                          {isAI ? 'AI助手' : msg.username}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <div
                        className={`text-sm leading-relaxed px-3 py-2 rounded-xl inline-block max-w-[85%] ${
                          isAI
                            ? 'rounded-tl-sm'
                            : isMe
                              ? 'rounded-tr-sm'
                              : 'rounded-tl-sm'
                        }`}
                        style={{
                          background: isAI
                            ? 'linear-gradient(135deg, rgba(251,146,60,0.08), rgba(249,115,22,0.04))'
                            : isMe
                              ? 'var(--accent-glow)'
                              : 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          border: isAI ? '1px solid rgba(251,146,60,0.15)' : 'none',
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
            {user ? (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="说点什么... (Enter发送)"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: error ? '#ef4444' : 'var(--border-light)',
                    color: 'var(--text-primary)',
                  }}
                  maxLength={2000}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                  style={{
                    background: inputText.trim() && !sending ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                    color: inputText.trim() && !sending ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {sending ? '发送中...' : '发送 💬'}
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <a
                  href="/auth/login"
                  className="text-sm font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  登录后参与社区讨论 →
                </a>
              </div>
            )}
            {error && (
              <p className="text-xs mt-1.5 text-red-500">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
