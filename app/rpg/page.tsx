'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
};

const SYS_LABEL: Record<string, string> = {
  dnd5e: 'D&D 5e', coc7th: 'CoC 7th', shadowrun: '暗影狂奔', custom: '自由',
};

const MODE_LABEL: Record<string, string> = {
  solo: '单人', coop: '合作', human_gm: '真人GM', hybrid: '混合',
};

const STATUS_COLORS: Record<string, string> = {
  recruiting: '#60a5fa', active: '#22c55e', paused: '#f59e0b', completed: '#8a8682',
};

export default function RpgLobbyPage() {
  const [tab, setTab] = useState<'campaigns' | 'characters'>('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/rpg/campaigns').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/rpg/characters').then(r => r.ok ? r.json() : Promise.reject()),
    ]).then(([c, ch]) => {
      if (c.success) setCampaigns(c.data || []);
      if (ch.success) setCharacters(ch.data || []);
    }).catch(() => setAuthError(true)).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 32, marginBottom: 8 }}>
            雾隐酒馆
          </h1>
          <p style={{ color: C.textSec, fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            在迷雾笼罩的酒馆中，冒险正在等待。创建你的角色，踏上 AI 驱动的史诗冒险。
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <Link href="/rpg/characters/create"
              style={{
                padding: '8px 20px', borderRadius: 6,
                background: C.goldDim + '20', border: `1px solid ${C.goldDim}`,
                color: C.gold, textDecoration: 'none', fontSize: 14,
              }}>
              ✦ 创建角色
            </Link>
            <Link href="/rpg/campaigns/new"
              style={{
                padding: '8px 20px', borderRadius: 6,
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                color: '#0b0b0f', textDecoration: 'none', fontSize: 14, fontWeight: 600,
              }}>
              ⚔️ 开始冒险
            </Link>
            <Link href="/rpg/lorebooks"
              style={{
                padding: '8px 20px', borderRadius: 6,
                background: '#8b5cf615', border: '1px solid #8b5cf640',
                color: '#a78bfa', textDecoration: 'none', fontSize: 14,
              }}>
              📖 世界书
            </Link>
          </div>
        </div>

        {authError && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, background: '#ef444415',
            border: '1px solid #ef444440', marginBottom: 20, textAlign: 'center',
          }}>
            <p style={{ color: '#ef4444', fontSize: 14, margin: 0 }}>
              请先 <Link href="/login" style={{ color: C.gold }}>登录</Link> 或 <Link href="/register" style={{ color: C.gold }}>注册</Link> 以使用跑团功能
            </p>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {[
            { key: 'campaigns' as const, label: '我的冒险', count: campaigns.length },
            { key: 'characters' as const, label: '角色工坊', count: characters.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px', cursor: 'pointer', fontSize: 14,
                background: 'transparent', border: 'none',
                color: tab === t.key ? C.gold : C.textDim,
                borderBottom: tab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
                transition: 'all 0.2s',
              }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 11,
                  background: tab === t.key ? C.gold + '20' : C.border,
                  color: tab === t.key ? C.gold : C.textDim,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 100, borderRadius: 8, background: C.card }} />
            ))}
          </div>
        ) : tab === 'campaigns' ? (
          campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textDim }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>⚔️</p>
              <p style={{ fontSize: 15, marginBottom: 8, color: C.textSec }}>还没有冒险</p>
              <p style={{ fontSize: 13 }}>创建你的第一个战役，开始 AI 驱动的冒险之旅</p>
              <Link href="/rpg/campaigns/new"
                style={{
                  display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 6,
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                  color: '#0b0b0f', textDecoration: 'none', fontSize: 14, fontWeight: 600,
                }}>
                开始冒险
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {campaigns.map((c: any) => (
                <Link key={c.id} href={`/rpg/campaigns/${c.id}`}
                  style={{
                    padding: 16, borderRadius: 8, background: C.card,
                    border: `1px solid ${C.border}`, textDecoration: 'none',
                    display: 'block', transition: 'border-color 0.2s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{
                        fontFamily: "'Fraunces', Georgia, serif", fontSize: 16,
                        color: C.gold, margin: '0 0 4px',
                      }}>
                        {c.name}
                      </h3>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: C.textSec }}>
                        <span>{SYS_LABEL[c.system] || c.system}</span>
                        <span>·</span>
                        <span>{MODE_LABEL[c.mode] || c.mode}</span>
                        <span>·</span>
                        <span>👥 {c.player_count || 1}</span>
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 10px', borderRadius: 4, fontSize: 11,
                      background: (STATUS_COLORS[c.status] || C.textDim) + '20',
                      color: STATUS_COLORS[c.status] || C.textDim,
                    }}>
                      {c.status}
                    </span>
                  </div>
                  {c.world_brief && (
                    <p style={{
                      fontSize: 13, color: C.textDim, marginTop: 8, margin: '8px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {c.world_brief}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )
        ) : (
          characters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textDim }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>🎭</p>
              <p style={{ fontSize: 15, marginBottom: 8, color: C.textSec }}>还没有角色</p>
              <p style={{ fontSize: 13 }}>创建你的第一个角色，为冒险做好准备</p>
              <Link href="/rpg/characters/create"
                style={{
                  display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 6,
                  background: C.goldDim + '20', border: `1px solid ${C.goldDim}`,
                  color: C.gold, textDecoration: 'none', fontSize: 14,
                }}>
                创建角色
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {characters.map((ch: any) => (
                <Link key={ch.id} href={`/rpg/characters/${ch.id}`}
                  style={{
                    padding: 14, borderRadius: 8, background: C.card,
                    border: `1px solid ${C.border}`, textDecoration: 'none',
                    transition: 'border-color 0.2s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: C.gold + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      🎭
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{ch.name}</div>
                      <div style={{ fontSize: 12, color: C.textDim }}>{SYS_LABEL[ch.system] || ch.system}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
