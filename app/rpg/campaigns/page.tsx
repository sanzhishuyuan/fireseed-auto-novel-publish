'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  purple: '#a78bfa',
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

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    fetch('/api/rpg/campaigns')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(c => {
        if (c.success) setCampaigns(c.data || []);
      })
      .catch(() => setAuthError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, margin: 0 }}>
              ⚔ 副本
            </h1>
            <p style={{ color: C.textSec, fontSize: 13, margin: '4px 0 0' }}>
              管理你的所有副本，或创建新的冒险
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/rpg"
              style={{
                padding: '8px 16px', borderRadius: 6,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textSec, textDecoration: 'none', fontSize: 13,
              }}>
              ← 返回酒馆
            </Link>
            <Link href="/rpg/campaigns/new"
              style={{
                padding: '8px 20px', borderRadius: 6,
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                color: '#0b0b0f', textDecoration: 'none', fontSize: 14, fontWeight: 600,
              }}>
              + 创建副本
            </Link>
          </div>
        </div>

        {authError && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, background: '#ef444415',
            border: '1px solid #ef444440', marginBottom: 20, textAlign: 'center',
          }}>
            <p style={{ color: '#ef4444', fontSize: 14, margin: 0 }}>
              请先 <Link href="/login" style={{ color: C.gold }}>登录</Link> 或 <Link href="/register" style={{ color: C.gold }}>注册</Link> 以使用副本功能
            </p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 100, borderRadius: 8, background: C.card }} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textDim }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>⚔️</p>
            <p style={{ fontSize: 16, marginBottom: 8, color: C.textSec }}>还没有副本</p>
            <p style={{ fontSize: 13, marginBottom: 20 }}>创建你的第一个副本，开始 AI 驱动的冒险之旅</p>
            <Link href="/rpg/campaigns/new"
              style={{
                display: 'inline-block', padding: '10px 24px', borderRadius: 6,
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                color: '#0b0b0f', textDecoration: 'none', fontSize: 14, fontWeight: 600,
              }}>
              创建副本
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {campaigns.map((c: any) => {
              const isPurchased = !!c._purchased;
              return (
                <Link key={c.id} href={`/rpg/campaigns/${c.id}`}
                  style={{
                    padding: 16, borderRadius: 8, background: C.card,
                    border: `1px solid ${isPurchased ? C.purple + '30' : C.border}`, textDecoration: 'none',
                    display: 'block', transition: 'border-color 0.2s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{
                        fontFamily: "'Fraunces', Georgia, serif", fontSize: 16,
                        color: C.gold, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        {c.name}
                        {isPurchased && (
                          <span style={{
                            padding: '1px 8px', borderRadius: 4, fontSize: 11,
                            background: C.purple + '20', color: C.purple, fontFamily: 'sans-serif',
                          }}>
                            已购买
                          </span>
                        )}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
