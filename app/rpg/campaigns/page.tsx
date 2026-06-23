'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: 'var(--codex-bg)', card: 'var(--codex-bg-card)', border: 'var(--codex-border)',
  gold: 'var(--codex-gold)', goldDim: 'var(--codex-gold)',
  text: 'var(--codex-text)', textSec: 'var(--codex-text-dim)', textDim: 'var(--codex-text-muted)',
  purple: 'var(--codex-purple)',
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
  const [tab, setTab] = useState<'owned' | 'purchased'>('owned');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  const loadList = async (t?: string) => {
    setLoading(true);
    try {
      const currentTab = t || tab;
      const res = await fetch(`/api/rpg/campaigns?tab=${currentTab}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      if (d.success) setCampaigns(d.data || []);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadList(); }, []);

  const handleTabChange = (t: 'owned' | 'purchased') => {
    setTab(t);
    loadList(t);
  };

  const ownedCount = campaigns.filter(c => !c._purchased).length;
  const purchasedCount = campaigns.filter(c => !!c._purchased).length;

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
              管理你的所有副本，创建或购买新的冒险
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/rpg"
              className="nav-back-btn"
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                background: 'var(--codex-gold-glow)',
                border: '1px solid var(--codex-border-gold)',
                color: C.gold,
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 600,
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}>
              ← 回到酒馆
            </Link>
            {tab === 'owned' && (
              <Link href="/rpg/campaigns/new"
                style={{
                  padding: '8px 20px', borderRadius: 6,
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                  color: '#0b0b0f', textDecoration: 'none', fontSize: 14, fontWeight: 600,
                }}>
                + 创建副本
              </Link>
            )}
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {([
            { key: 'owned' as const, label: '我的副本', count: ownedCount },
            { key: 'purchased' as const, label: '已购买', count: purchasedCount },
          ]).map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              style={{
                padding: '10px 20px', cursor: 'pointer', fontSize: 14,
                background: 'transparent', border: 'none',
                color: tab === t.key ? C.gold : C.textDim,
                borderBottom: tab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
                transition: 'all 0.2s',
              }}>
              {t.label}
              {tab === t.key && t.count > 0 && (
                <span style={{
                  marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 11,
                  background: C.gold + '20', color: C.gold,
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
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textDim }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>⚔️</p>
            <p style={{ fontSize: 16, marginBottom: 8, color: C.textSec }}>
              {tab === 'purchased' ? '还没有购买过副本' : '还没有副本'}
            </p>
            <p style={{ fontSize: 13, marginBottom: 20 }}>
              {tab === 'purchased' ? (
                <Link href="/rpg/market" style={{ color: C.gold }}>去异界世场逛逛，购买其他创作者的副本</Link>
              ) : '创建你的第一个副本，开始 AI 驱动的冒险之旅'}
            </p>
            {tab === 'owned' && (
              <Link href="/rpg/campaigns/new"
                style={{
                  display: 'inline-block', padding: '10px 24px', borderRadius: 6,
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                  color: '#0b0b0f', textDecoration: 'none', fontSize: 14, fontWeight: 600,
                }}>
                创建副本
              </Link>
            )}
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
