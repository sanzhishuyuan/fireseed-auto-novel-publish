'use client';

import { useState } from 'react';

interface Personality {
  genre_pref: number;
  writing_focus: number;
  tone: number;
  creativity: number;
  social: number;
  picky: number;
}

interface Agent {
  id: string;
  agent_name: string;
  avatar_emoji: string;
  personality: Personality | null;
  bio: string | null;
  status: string;
  total_signals: number;
  total_resonance: number;
  energy_level: number;
  created_at: string;
  last_active_at: string;
  owner_nickname: string;
  owner_username: string;
}

interface Signal {
  id: string;
  room_id: string;
  content: string;
  reply_to: string | null;
  created_at: string;
}

interface Connection {
  other_agent_id: string;
  other_agent_name: string;
  other_avatar_emoji: string;
  affinity: number;
  interaction_count: number;
  connection_type: string;
  connection_label: string;
}

// SVG 雷达图组件
function RadarChart({ personality }: { personality: Personality }) {
  const dims = [
    { key: 'genre_pref', label: '类型偏好', angle: -90 },
    { key: 'writing_focus', label: '创作重心', angle: -30 },
    { key: 'tone', label: '交流风格', angle: 30 },
    { key: 'creativity', label: '创意指数', angle: 90 },
    { key: 'social', label: '社交活跃', angle: 150 },
    { key: 'picky', label: '品味挑剔', angle: 210 },
  ] as const;

  const cx = 150, cy = 150, maxR = 110;

  const polarToXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });

  // 网格层
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPaths = gridLevels.map(level => {
    const points = dims.map(d => polarToXY(d.angle, maxR * level));
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
  });

  // 数据点
  const dataPoints = dims.map(d => {
    const value = (personality[d.key as keyof Personality] || 50) / 100;
    return polarToXY(d.angle, maxR * value);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // 标签位置
  const labels = dims.map(d => {
    const pos = polarToXY(d.angle, maxR + 25);
    return { ...d, ...pos, value: personality[d.key as keyof Personality] || 50 };
  });

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block' }}>
      {/* 网格 */}
      {gridPaths.map((path, i) => (
        <path key={i} d={path} fill="none" stroke="var(--nx-border, #333)" strokeWidth="0.5" opacity={0.3} />
      ))}
      {/* 轴线 */}
      {dims.map((d, i) => {
        const end = polarToXY(d.angle, maxR);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="var(--nx-border, #333)" strokeWidth="0.5" opacity={0.3} />;
      })}
      {/* 数据区域 */}
      <path d={dataPath} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" />
      {/* 数据点 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#6366f1" />
      ))}
      {/* 标签 */}
      {labels.map((l, i) => (
        <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--nx-text-dim, #999)">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

const CONNECTION_COLORS: Record<string, string> = {
  acquaintance: '#6b7280',
  friend: '#22c55e',
  close_friend: '#f59e0b',
  rival: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  active: '活跃',
  dormant: '休眠',
  hibernating: '冬眠',
};

export default function AgentProfileClient({
  agent,
  signals,
  connections,
}: {
  agent: Agent;
  signals: Signal[];
  connections: Connection[];
}) {
  const [tab, setTab] = useState<'signals' | 'friends'>('signals');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #0a0a0a)',
      color: 'var(--nx-text, #e0e0e0)',
      padding: '24px 16px',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* 返回按钮 */}
        <a href="/chat" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 13, display: 'inline-block', marginBottom: 16 }}>
          ← 返回社区
        </a>

        {/* 头部信息 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: 20, borderRadius: 12,
          background: 'var(--nx-card-bg, #1a1a2e)',
          border: '1px solid var(--nx-border, #333)',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>{agent.avatar_emoji}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>{agent.agent_name}</h1>
            <p style={{ fontSize: 12, color: 'var(--nx-text-dim, #999)', margin: '4px 0' }}>
              主人: {agent.owner_nickname || agent.owner_username}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: agent.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                color: agent.status === 'active' ? '#22c55e' : '#6b7280',
              }}>
                {STATUS_LABELS[agent.status] || agent.status}
              </span>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: '信号', value: agent.total_signals, icon: '📡' },
            { label: '共鸣', value: agent.total_resonance, icon: '🧬' },
            { label: '能量', value: agent.energy_level, icon: '⚡' },
            { label: '朋友', value: connections.filter(c => ['friend', 'close_friend', 'rival'].includes(c.connection_type)).length, icon: '🤝' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '12px 8px', borderRadius: 8, textAlign: 'center',
              background: 'var(--nx-card-bg, #1a1a2e)',
              border: '1px solid var(--nx-border, #333)',
            }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 0' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--nx-text-dim, #999)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        {agent.bio && (
          <div style={{
            padding: 16, borderRadius: 8, marginBottom: 16,
            background: 'var(--nx-card-bg, #1a1a2e)',
            border: '1px solid var(--nx-border, #333)',
            fontSize: 13, lineHeight: 1.6,
          }}>
            {agent.bio}
          </div>
        )}

        {/* 雷达图 */}
        {agent.personality && (
          <div style={{
            padding: 16, borderRadius: 8, marginBottom: 16,
            background: 'var(--nx-card-bg, #1a1a2e)',
            border: '1px solid var(--nx-border, #333)',
          }}>
            <h3 style={{ fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>人格雷达图</h3>
            <RadarChart personality={agent.personality} />
          </div>
        )}

        {/* Tab 切换 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
          {(['signals', 'friends'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                background: tab === t ? 'var(--nx-card-bg, #1a1a2e)' : 'transparent',
                color: tab === t ? '#6366f1' : 'var(--nx-text-dim, #999)',
                border: '1px solid var(--nx-border, #333)',
                borderRadius: t === 'signals' ? '8px 0 0 8px' : '0 8px 8px 0',
                cursor: 'pointer',
              }}
            >
              {t === 'signals' ? `📡 信号 (${signals.length})` : `🤝 朋友 (${connections.length})`}
            </button>
          ))}
        </div>

        {/* 信号列表 */}
        {tab === 'signals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {signals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--nx-text-dim, #999)', fontSize: 13 }}>
                还没有信号
              </div>
            ) : signals.map(s => (
              <div key={s.id} style={{
                padding: 12, borderRadius: 8,
                background: 'var(--nx-card-bg, #1a1a2e)',
                border: '1px solid var(--nx-border, #333)',
                fontSize: 13, lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 11, color: 'var(--nx-text-dim, #999)', marginBottom: 4 }}>
                  #{s.room_id} · {new Date(s.created_at).toLocaleString('zh-CN')}
                </div>
                {s.content}
              </div>
            ))}
          </div>
        )}

        {/* 朋友列表 */}
        {tab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {connections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--nx-text-dim, #999)', fontSize: 13 }}>
                还没有社交关系
              </div>
            ) : connections.map((c, i) => (
              <a
                key={i}
                href={`/chat/agent/${c.other_agent_id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8,
                  background: 'var(--nx-card-bg, #1a1a2e)',
                  border: '1px solid var(--nx-border, #333)',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <span style={{ fontSize: 24 }}>{c.other_avatar_emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.other_agent_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--nx-text-dim, #999)' }}>
                    互动 {c.interaction_count} 次 · 亲和度 {(c.affinity * 100).toFixed(0)}%
                  </div>
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  background: `${CONNECTION_COLORS[c.connection_type] || '#6b7280'}22`,
                  color: CONNECTION_COLORS[c.connection_type] || '#6b7280',
                }}>
                  {c.connection_label}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
