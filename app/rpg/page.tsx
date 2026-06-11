'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
};

interface CampaignSummary {
  id: string; name: string; mode: string; system: string;
  status: string; world_brief: string; created_at: string;
  player_count: number;
}

interface CharSummary {
  id: string; name: string; system: string; avatar_url: string;
  updated_at: string;
}

export default function RPGLobby() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [characters, setCharacters] = useState<CharSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'campaigns' | 'characters'>('campaigns');

  useEffect(() => {
    Promise.all([
      fetch('/api/rpg/campaigns').then(r => r.json()),
      fetch('/api/rpg/characters').then(r => r.json()),
    ]).then(([campData, charData]) => {
      if (campData.success) setCampaigns(campData.data || []);
      if (charData.success) setCharacters(charData.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const modeLabel: Record<string, string> = { solo: '单人', coop: '多人合作', human_gm: '真人 GM', hybrid: '混合' };
  const sysLabel: Record<string, string> = { dnd5e: 'D&D 5e', coc7th: 'CoC 7th', shadowrun: '暗影狂奔', custom: '自由' };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      {/* Hero */}
      <div style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold }}>
            雾隐酒馆
          </h1>
          <p style={{ color: C.textSec, maxWidth: 540, margin: '0 auto' }}>
            在迷雾笼罩的酒馆中，冒险正在等待。创建你的角色，踏上 AI 驱动的史诗冒险。
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-5xl mx-auto px-4 py-6 flex gap-3 flex-wrap">
        <Link href="/rpg/characters/create"
          className="codex-btn-gold" style={{ padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
          ✦ 创建角色
        </Link>
        <Link href="/rpg/campaigns/new"
          className="codex-btn-ghost" style={{ padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
          ⚔️ 开始冒险
        </Link>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4">
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
          {[
            { key: 'campaigns', label: '我的冒险' },
            { key: 'characters', label: '角色工坊' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{
                padding: '10px 24px', background: 'transparent', border: 'none',
                color: tab === t.key ? C.gold : C.textSec,
                borderBottom: tab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
                cursor: 'pointer', fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
                transition: 'all 0.2s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px 0' }}>
          {loading ? (
            <div className="codex-skeleton" style={{ height: 200, borderRadius: 8 }} />
          ) : tab === 'campaigns' ? (
            campaigns.length === 0 ? (
              <div className="codex-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 18, marginBottom: 8 }}>⚔️</p>
                <p style={{ color: C.textSec, marginBottom: 16 }}>还没有冒险记录</p>
                <Link href="/rpg/campaigns/new" className="codex-btn-gold" style={{ padding: '8px 20px', borderRadius: 6, textDecoration: 'none' }}>
                  开始你的第一个冒险
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {campaigns.map(c => (
                  <Link key={c.id} href={`/rpg/campaigns/${c.id}`}
                    style={{
                      display: 'block', padding: 16, borderRadius: 8, background: C.card,
                      border: `1px solid ${C.border}`, textDecoration: 'none', color: 'inherit',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.goldDim; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", margin: 0, fontSize: 16, color: C.gold }}>
                        {c.name}
                      </h3>
                      <span className={`codex-badge-${c.status === 'active' ? 'green' : c.status === 'paused' ? 'gray' : 'blue'}`}
                        style={{ fontSize: 11, padding: '2px 8px' }}>
                        {c.status === 'active' ? '进行中' : c.status === 'paused' ? '已暂停' : c.status === 'completed' ? '已完结' : '招募中'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: C.textSec }}>
                      <span>{modeLabel[c.mode] || c.mode}</span>
                      <span>|</span>
                      <span>{sysLabel[c.system] || c.system}</span>
                      <span>|</span>
                      <span>{c.player_count} 位冒险者</span>
                    </div>
                    {c.world_brief && (
                      <p style={{ fontSize: 13, color: C.textSec, margin: '8px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.world_brief}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )
          ) : (
            characters.length === 0 ? (
              <div className="codex-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 18, marginBottom: 8 }}>🎭</p>
                <p style={{ color: C.textSec, marginBottom: 16 }}>还没有角色</p>
                <Link href="/rpg/characters/create" className="codex-btn-gold" style={{ padding: '8px 20px', borderRadius: 6, textDecoration: 'none' }}>
                  创建你的第一个角色
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {characters.map(ch => (
                  <Link key={ch.id} href={`/rpg/characters/${ch.id}`}
                    style={{
                      display: 'block', padding: 16, borderRadius: 8, background: C.card,
                      border: `1px solid ${C.border}`, textDecoration: 'none', color: 'inherit',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: C.border,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, overflow: 'hidden',
                      }}>
                        {ch.avatar_url ? <img src={ch.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🎭'}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 15, color: C.gold }}>{ch.name}</h4>
                        <span style={{ fontSize: 12, color: C.textSec }}>{sysLabel[ch.system] || ch.system}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
