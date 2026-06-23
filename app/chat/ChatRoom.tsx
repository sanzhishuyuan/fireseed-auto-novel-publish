'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Badge, EmptyState, Skeleton } from '@/components/ui';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
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
  agent_id: string | null;
  reply_to: string | null;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════════
   AI Agent Definitions — each is a unique signal node
   ═══════════════════════════════════════════════════════════════ */
const AI_AGENTS = [
  { id: 'spark',   name: '星火 SPARK',    role: '创意写作',  color: '#f59e0b', initial: '星' },
  { id: 'dream',   name: '织梦 DREAM',    role: '人物塑造',  color: '#e879f9', initial: '梦' },
  { id: 'quantum', name: '量子 QUANTUM',  role: '情节架构',  color: '#06b6d4', initial: '量' },
  { id: 'echo',    name: '回声 ECHO',     role: '文风润色',  color: '#84cc16', initial: '回' },
] as const;

const AGENT_COLORS: Record<string, string> = {
  spark: '#f59e0b',
  dream: '#e879f9',
  quantum: '#06b6d4',
  echo: '#84cc16',
};

function getAgentColor(username: string, agentId?: string | null): string | null {
  // 优先用 agent_id 映射
  if (agentId && AGENT_COLORS[agentId]) return AGENT_COLORS[agentId];
  // fallback: 用 username 匹配
  if (username === 'AI助手') return '#f59e0b';
  for (const a of AI_AGENTS) {
    if (username.includes(a.name.split(' ')[0])) return a.color;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */
export default function ChatRoom({ user, rooms }: { user: User | null; rooms: Room[] }) {
  const [activeRoom, setActiveRoom] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showGuide, setShowGuide] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string; content: string } | null>(null);
  const [stats, setStats] = useState<{
    total_messages: number; today_messages: number; active_agents: number;
    total_agents: number; human_messages: number; ai_messages: number;
    total_likes: number; today_likes: number; total_connections: number;
    top_agents: { id: string; agent_name: string; avatar_emoji: string; owner_name: string; message_count: number }[];
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string>('');

  // ── Hydration guard: first render must match SSR exactly ──
  useEffect(() => { setMounted(true); }, []);

  // ── Load messages ──
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

  // ── Fetch stats ──
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/chat/stats?room=${activeRoom}`);
        const data = await res.json();
        if (data.success) setStats(data.stats);
      } catch (e) { /* ignore */ }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  // ── Reply handler ──
  const handleReply = (msg: Message) => {
    setReplyTo({ id: msg.id, username: msg.username, content: msg.content.slice(0, 60) });
    setInputText(`@${msg.username} `);
  };

  // ── Realtime SSE ──
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setHasMore(true);
    loadMessages(activeRoom);

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
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            lastMsgIdRef.current = msg.id;
          }
        } catch { /* ignore */ }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimer = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [activeRoom, loadMessages]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Load more on scroll top ──
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const oldest = messages[0];
          if (oldest) loadMessages(activeRoom, oldest.id);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [messages, hasMore, loading, activeRoom, loadMessages]);

  // ── Send message ──
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !user) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: activeRoom, content: text, reply_to: replyTo?.id || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setInputText('');
        setReplyTo(null);
      } else {
        setError(typeof data.error === 'string' ? data.error : data.error?.message || '发送失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLike = (msgId: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  // ── Helpers ──
  const formatTime = (iso: string) => {
    if (!mounted) return '···';
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const activeRoomData = rooms.find(r => r.id === activeRoom) || rooms[0];
  const displayName = user?.nickname || user?.username || '';

  // Count AI messages for agent stats
  const agentMsgCounts: Record<string, number> = {};
  for (const m of messages) {
    if (m.is_ai === 1) {
      const initial = m.username.charAt(0);
      agentMsgCounts[initial] = (agentMsgCounts[initial] || 0) + 1;
    }
  }

  return (
    <div className="chat-layout">
      {/* ═══════ LEFT SIDEBAR ═══════ */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">频道</div>
        </div>
        <div className="chat-room-list">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`chat-room-item${activeRoom === room.id ? ' active' : ''}`}
              onClick={() => setActiveRoom(room.id)}
            >
              <div className="chat-room-icon">{room.icon}</div>
              <div className="chat-room-info">
                <div className="chat-room-name">{room.name}</div>
                <div className="chat-room-desc">{room.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ═══════ MAIN CHAT AREA ═══════ */}
      <main className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="flex items-center gap-3">
            <span className="text-lg">{activeRoomData.icon}</span>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">{activeRoomData.name}</div>
              <div className="text-xs text-[var(--text-muted)]">{activeRoomData.desc}</div>
            </div>
          </div>
          <Badge variant="success" size="sm">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
            {AI_AGENTS.length} agents
          </Badge>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          <div ref={loadMoreRef} className="text-center text-xs text-[var(--text-muted)] py-2 cursor-pointer hover:text-[var(--accent)] transition-colors">
            {hasMore ? '↑ 加载更多' : '— 没有更多消息 —'}
          </div>

          {loading ? (
            <div className="space-y-4 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="chat-message">
                  <Skeleton circle width={36} height={36} />
                  <div className="chat-message-body space-y-2">
                    <Skeleton width={120} height={14} />
                    <Skeleton width="80%" height={60} />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={<span className="text-4xl">📡</span>}
              title="暂无消息"
              description="发送第一条消息，启动社区交流"
            />
          ) : (
            messages.map((msg) => {
              const isAI = msg.is_ai === 1;
              const isMe = !isAI && msg.user_id === user?.userId;
              const agentColor = getAgentColor(msg.username, msg.agent_id);

              return (
                <div key={msg.id} className="chat-message">
                  {/* Avatar */}
                  <div
                    className={`chat-message-avatar${isAI ? ' chat-message-avatar-agent' : isMe ? ' chat-message-avatar-me' : ''}`}
                    data-agent-color={agentColor || '#f59e0b'}
                  >
                    {isAI ? (msg.username.charAt(0)) : (isMe ? displayName.charAt(0).toUpperCase() : msg.username.charAt(0).toUpperCase())}
                  </div>

                  {/* Body */}
                  <div className="chat-message-body">
                    <div className="chat-message-header">
                      <span className="chat-message-name" style={{ color: isAI ? (agentColor || '#f59e0b') : isMe ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {isAI ? msg.username : (isMe ? displayName || msg.username : msg.username)}
                      </span>
                      <Badge
                        variant={isAI ? 'warning' : 'info'}
                        size="sm"
                        className={isAI ? 'chat-agent-badge' : ''}
                        data-agent-color={agentColor || '#f59e0b'}
                      >
                        {isAI ? 'AGENT' : 'HUMAN'}
                      </Badge>
                      <span className="chat-message-time">{formatTime(msg.created_at)}</span>
                    </div>

                    <div
                      className={`chat-message-content${isAI ? ' chat-message-content-agent' : ''}`}
                      data-agent-color={agentColor || '#f59e0b'}
                    >
                      {msg.content}
                    </div>

                    {/* Actions */}
                    <div className="chat-message-actions">
                      <button
                        className={`chat-message-action${likedIds.has(msg.id) ? ' liked' : ''}`}
                        onClick={() => handleLike(msg.id)}
                      >
                        <span>♥</span>
                      </button>
                      <button className="chat-message-action" onClick={() => handleReply(msg)}>
                        <span>↩</span> 回复
                      </button>
                      {isAI && (
                        <button className="chat-message-action">
                          <span>⚡</span> 充能
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          {user ? (
            <>
              {replyTo && (
                <div className="chat-reply-bar">
                  <span className="text-[var(--accent)]">↩</span>
                  <span className="flex-1 min-w-0 truncate">
                    回复 <b className="text-[var(--text-primary)]">@{replyTo.username}</b>: {replyTo.content}
                  </span>
                  <button
                    onClick={() => { setReplyTo(null); setInputText(''); }}
                    className="chat-reply-close"
                  >✕</button>
                </div>
              )}
              {/* @Agent Quick Buttons */}
              <div className="chat-agent-mentions">
                {AI_AGENTS.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      const mention = `@${agent.name.split(' ')[0]} `;
                      setInputText(prev => {
                        const trimmed = prev.trimEnd();
                        if (trimmed && !trimmed.endsWith(' ')) return trimmed + ' ' + mention;
                        return (prev || '') + mention;
                      });
                    }}
                    className="chat-agent-mention-btn"
                    style={{
                      borderColor: `${agent.color}33`,
                      background: `${agent.color}12`,
                      color: agent.color,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget).style.background = `${agent.color}25`;
                      (e.currentTarget).style.borderColor = `${agent.color}66`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget).style.background = `${agent.color}12`;
                      (e.currentTarget).style.borderColor = `${agent.color}33`;
                    }}
                  >
                    <span>{agent.initial}</span>
                    {agent.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="chat-input-wrap">
                <textarea
                  className="chat-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="发送消息到社区... (Enter 发送)"
                  maxLength={2000}
                  disabled={sending}
                  rows={1}
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="chat-send-btn"
                >
                  {sending ? '...' : '发送'}
                </Button>
              </div>
              <div className="chat-input-hint">
                <kbd>Enter</kbd> 发送 &nbsp; <kbd>Shift+Enter</kbd> 换行
              </div>
            </>
          ) : (
            <div className="text-center py-3">
              <a href="/auth/login" className="text-[var(--accent)] hover:underline text-sm font-medium">
                登录后参与社区讨论 →
              </a>
            </div>
          )}
          {error && (
            <p className="text-xs text-red-500 mt-2 font-mono">{error}</p>
          )}
        </div>
      </main>
    </div>
  );
}
