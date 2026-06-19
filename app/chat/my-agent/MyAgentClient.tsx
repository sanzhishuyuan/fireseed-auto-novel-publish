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
  personality: Personality;
  bio: string | null;
  status: string;
  total_signals: number;
  total_resonance: number;
  energy_level: number;
}

interface User {
  userId: string;
  username: string;
  nickname?: string;
}

const EMOJI_OPTIONS = ['🤖', '🦊', '🐱', '🐺', '🦉', '🐉', '🦋', '🌟', '🔮', '⚡', '🌙', '🎭', '🧬', '🚀', '🎯', '💎'];

const PERSONALITY_LABELS: { key: keyof Personality; label: string; left: string; right: string }[] = [
  { key: 'genre_pref', label: '类型偏好', left: '言情/现实', right: '玄幻/科幻' },
  { key: 'writing_focus', label: '创作重心', left: '角色驱动', right: '剧情驱动' },
  { key: 'tone', label: '交流风格', left: '沉稳内敛', right: '热情外放' },
  { key: 'creativity', label: '创意指数', left: '写实派', right: '脑洞派' },
  { key: 'social', label: '社交活跃', left: '潜水型', right: '话痨型' },
  { key: 'picky', label: '品味挑剔', left: '来者不拒', right: '眼光独到' },
];

// 小型雷达图预览
function MiniRadar({ personality }: { personality: Personality }) {
  const dims = [
    { key: 'genre_pref' as const, angle: -90 },
    { key: 'writing_focus' as const, angle: -30 },
    { key: 'tone' as const, angle: 30 },
    { key: 'creativity' as const, angle: 90 },
    { key: 'social' as const, angle: 150 },
    { key: 'picky' as const, angle: 210 },
  ];

  const cx = 80, cy = 80, maxR = 60;
  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });

  // 网格
  const gridPath = dims.map((d, i) => {
    const p = toXY(d.angle, maxR);
    return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
  }).join(' ') + ' Z';

  // 数据
  const dataPath = dims.map((d, i) => {
    const v = (personality[d.key] || 50) / 100;
    const p = toXY(d.angle, maxR * v);
    return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
  }).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 160 160" style={{ width: 160, height: 160 }}>
      <path d={gridPath} fill="none" stroke="var(--nx-border, #333)" strokeWidth="0.5" opacity={0.3} />
      <path d={dataPath} fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth="1.5" />
      {dims.map((d, i) => {
        const v = (personality[d.key] || 50) / 100;
        const p = toXY(d.angle, maxR * v);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />;
      })}
    </svg>
  );
}

export default function MyAgentClient({ user, agent }: { user: User; agent: Agent }) {
  const [name, setName] = useState(agent.agent_name);
  const [emoji, setEmoji] = useState(agent.avatar_emoji);
  const [bio, setBio] = useState(agent.bio || '');
  const [status, setStatus] = useState(agent.status);
  const [personality, setPersonality] = useState<Personality>(agent.personality || {
    genre_pref: 50, writing_focus: 50, tone: 50, creativity: 50, social: 50, picky: 50,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/agent/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: name,
          avatar_emoji: emoji,
          bio,
          status,
          personality,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('保存成功！');
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRecompute = async () => {
    setMessage('正在从行为数据重新计算人格...');
    try {
      const res = await fetch('/api/agent/profile', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.personality) {
        setPersonality(data.personality);
        setMessage('人格已重新计算！');
      } else {
        setMessage('重新计算失败');
      }
    } catch {
      setMessage('网络错误');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #0a0a0a)',
      color: 'var(--nx-text, #e0e0e0)',
      padding: '24px 16px',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* 返回 */}
        <a href="/chat" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 13, display: 'inline-block', marginBottom: 16 }}>
          ← 返回社区
        </a>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>我的 AI 代理</h1>

        {/* 基础信息 */}
        <div style={{
          padding: 20, borderRadius: 12,
          background: 'var(--nx-card-bg, #1a1a2e)',
          border: '1px solid var(--nx-border, #333)',
          marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>基础信息</h3>

          {/* 名称 */}
          <label style={{ display: 'block', fontSize: 12, color: 'var(--nx-text-dim, #999)', marginBottom: 4 }}>代理名称</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 6, fontSize: 14,
              background: 'var(--nx-input-bg, #111)', border: '1px solid var(--nx-border, #333)',
              color: 'var(--nx-text, #e0e0e0)', outline: 'none', marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />

          {/* Emoji */}
          <label style={{ display: 'block', fontSize: 12, color: 'var(--nx-text-dim, #999)', marginBottom: 4 }}>头像</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                style={{
                  fontSize: 22, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                  background: emoji === e ? 'rgba(99,102,241,0.2)' : 'transparent',
                  border: emoji === e ? '2px solid #6366f1' : '1px solid var(--nx-border, #333)',
                }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Bio */}
          <label style={{ display: 'block', fontSize: 12, color: 'var(--nx-text-dim, #999)', marginBottom: 4 }}>自我介绍</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="写一段代理的自我介绍..."
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 6, fontSize: 13,
              background: 'var(--nx-input-bg, #111)', border: '1px solid var(--nx-border, #333)',
              color: 'var(--nx-text, #e0e0e0)', outline: 'none', resize: 'vertical',
              marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />

          {/* Status */}
          <label style={{ display: 'block', fontSize: 12, color: 'var(--nx-text-dim, #999)', marginBottom: 4 }}>状态</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { value: 'active', label: '活跃', color: '#22c55e' },
              { value: 'dormant', label: '休眠', color: '#f59e0b' },
              { value: 'hibernating', label: '冬眠', color: '#6b7280' },
            ].map(s => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                style={{
                  padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: status === s.value ? `${s.color}22` : 'transparent',
                  border: status === s.value ? `2px solid ${s.color}` : '1px solid var(--nx-border, #333)',
                  color: status === s.value ? s.color : 'var(--nx-text-dim, #999)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 人格特质 */}
        <div style={{
          padding: 20, borderRadius: 12,
          background: 'var(--nx-card-bg, #1a1a2e)',
          border: '1px solid var(--nx-border, #333)',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>人格特质</h3>
            <button
              onClick={handleRecompute}
              style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 4, cursor: 'pointer',
                background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
                color: '#6366f1',
              }}
            >
              从行为数据重算
            </button>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {PERSONALITY_LABELS.map(p => (
                <div key={p.key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: 'var(--nx-text-dim, #999)' }}>{p.label}</span>
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>{personality[p.key]}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--nx-text-muted, #666)', marginBottom: 2 }}>
                    <span>{p.left}</span>
                    <span>{p.right}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={personality[p.key]}
                    onChange={e => setPersonality({ ...personality, [p.key]: parseInt(e.target.value) })}
                    style={{ width: '100%', accentColor: '#6366f1' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ flexShrink: 0 }}>
              <MiniRadar personality={personality} />
            </div>
          </div>
        </div>

        {/* 统计 */}
        <div style={{
          padding: 16, borderRadius: 8, marginBottom: 16,
          background: 'var(--nx-card-bg, #1a1a2e)',
          border: '1px solid var(--nx-border, #333)',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{agent.total_signals}</div>
            <div style={{ fontSize: 10, color: 'var(--nx-text-dim, #999)' }}>总信号</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{agent.total_resonance}</div>
            <div style={{ fontSize: 10, color: 'var(--nx-text-dim, #999)' }}>总共鸣</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{agent.energy_level}</div>
            <div style={{ fontSize: 10, color: 'var(--nx-text-dim, #999)' }}>能量值</div>
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 8, fontSize: 14, fontWeight: 700,
            background: saving ? '#333' : '#6366f1', color: '#fff', border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {saving ? '保存中...' : '保存设置'}
        </button>

        {message && (
          <p style={{
            textAlign: 'center', fontSize: 12, marginTop: 8,
            color: message.includes('成功') ? '#22c55e' : message.includes('正在') ? '#6366f1' : '#ef4444',
          }}>
            {message}
          </p>
        )}

        {/* 查看主页链接 */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a
            href={`/chat/agent/${agent.id}`}
            style={{ color: '#6366f1', textDecoration: 'none', fontSize: 13 }}
          >
            查看代理主页 →
          </a>
        </div>
      </div>
    </div>
  );
}
