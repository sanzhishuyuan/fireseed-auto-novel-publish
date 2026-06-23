'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: 'var(--codex-bg)', card: 'var(--codex-bg-card)', border: 'var(--codex-border)',
  gold: 'var(--codex-gold)', goldDim: 'var(--codex-gold)',
  text: 'var(--codex-text)', textSec: 'var(--codex-text-dim)', textDim: 'var(--codex-text-muted)',
  danger: 'var(--codex-red)', success: 'var(--codex-green)', purple: 'var(--codex-purple)', blue: 'var(--codex-blue)',
};

const LEVELS = [
  { level: 0, score: 0, label: '见习冒险者', icon: '🌱' },
  { level: 1, score: 50, label: '熟练旅人', icon: '✦' },
  { level: 2, score: 200, label: '资深创作者', icon: '⚜' },
  { level: 3, score: 800, label: '大师匠人', icon: '👑' },
  { level: 4, score: 3000, label: '传说工匠', icon: '⭐' },
  { level: 5, score: 10000, label: '千古巨匠', icon: '🌙' },
];

const LEVEL_COLORS: Record<number, string> = {
  0: '#8a8682', 1: '#60a5fa', 2: '#22c55e',
  3: '#a78bfa', 4: '#f59e0b', 5: '#c9a55c',
};

const PERMISSION_LABELS: Record<string, string> = {
  personal_create: '创建个人角色卡',
  join_campaign: '加入战役',
  share_asset: '共享资产到社区',
  rate_others: '评价他人作品',
  create_commission: '发布创作委托',
  public_free: '发布免费共享资产',
  sell_asset: '上架付费资产',
  max_price_500: '定价上限 500 SEED',
  sell_module: '上架战役模组',
  unlimited_price: '无限定价',
  arbitrate: '参与争议仲裁',
  fund_vote: '基金分配投票权',
  featured_slot: '精选位展示',
  custom_royalty: '自定义版税比例',
  advisor: '顾问委员会资格',
};

export default function CreatorProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // 1. 获取当前用户
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) { setError('请先登录'); return; }
      const authData = await authRes.json();
      if (!authData.success) { setError('请先登录'); return; }
      setUser(authData.data);

      // 2. 获取创作者档案
      const [profileRes, listingsRes, purchasesRes] = await Promise.all([
        fetch(`/api/rpg/creator?userId=${authData.data.id}`),
        fetch('/api/rpg/market/my?tab=listings'),
        fetch('/api/rpg/market/my?tab=purchases'),
      ]);

      if (profileRes.ok) {
        const pd = await profileRes.json();
        if (pd.success) setProfile(pd.data);
      }
      if (listingsRes.ok) {
        const ld = await listingsRes.json();
        if (ld.success) setListings(ld.data || []);
      }
      if (purchasesRes.ok) {
        const pd2 = await purchasesRes.json();
        if (pd2.success) setPurchases(pd2.data || []);
      }
    } catch {
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const level = profile?.level ?? 0;
  const score = profile?.score ?? 0;
  const nextLevel = LEVELS.find(l => l.level === level + 1);
  const currentLevelDef = LEVELS.find(l => l.level === level) || LEVELS[0];
  const prevThreshold = LEVELS.find(l => l.level === level)?.score ?? 0;
  const nextThreshold = nextLevel?.score ?? score;
  const progress = nextThreshold > prevThreshold
    ? Math.min(100, ((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
    : 100;

  // When max level, progress is 100%
  const displayProgress = level >= 5 ? 100 : Math.max(0, progress);
  const levelColor = LEVEL_COLORS[level] || C.textDim;

  const currentPerms = profile ? (() => {
    const allPerms: string[] = [];
    for (const l of LEVELS) {
      if (l.level <= level) {
        // Import the LEVEL_PERMISSIONS... but we can hardcode for display
      }
    }
    return allPerms;
  })() : [];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
        <div className="max-w-3xl mx-auto px-4 py-12">
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 100, borderRadius: 8, background: C.card, marginBottom: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: C.textSec, marginBottom: 16 }}>{error}</p>
          <Link href="/auth/login"
            style={{ padding: '8px 20px', borderRadius: 6, background: C.goldDim + '20', border: `1px solid ${C.goldDim}`, color: C.gold, textDecoration: 'none', fontSize: 14 }}>
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 导航面包屑 */}
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 24 }}>
          <Link href="/rpg" style={{ color: C.textDim, textDecoration: 'none' }}>雾隐酒馆</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: C.textSec }}>创作者中心</span>
        </div>

        {/* ===== 个人信息头 ===== */}
        <div style={{
          background: `linear-gradient(135deg, ${levelColor}08, ${C.card})`,
          border: `1px solid ${levelColor}20`,
          borderRadius: 12, padding: 24, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          {/* 等级图标 */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${levelColor}30, ${levelColor}10)`,
            border: `2px solid ${levelColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>
            {currentLevelDef.icon}
          </div>

          {/* 用户信息 */}
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: "'Fraunces', Georgia, serif", fontSize: 22,
              color: C.text, margin: '0 0 4px',
            }}>
              {user?.nickname || user?.username || '冒险者'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 10px', borderRadius: 4, fontSize: 12,
                background: levelColor + '20', color: levelColor, fontWeight: 500,
              }}>
                L{level} {currentLevelDef.label}
              </span>
              {user?.vipType && user.vipType !== 'free' && (
                <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 11, background: C.gold + '20', color: C.gold }}>
                  VIP · {user.vipType}
                </span>
              )}
              <span style={{ fontSize: 12, color: C.textDim }}>
                加入于 {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '—'}
              </span>
            </div>
          </div>

          {/* SEED 余额占位 - 连接到钱包 */}
          <Link href="/my"
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 13,
              background: C.card, border: `1px solid ${C.border}`,
              color: C.textSec, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
            个人中心 →
          </Link>
        </div>

        {/* ===== 等级进度 ===== */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, color: C.text, margin: 0, fontWeight: 500 }}>创作者等级</h2>
            <span style={{ fontSize: 13, color: levelColor }}>
              <strong style={{ fontSize: 18 }}>{score}</strong> / {nextLevel ? nextThreshold : score} 积分
            </span>
          </div>

          {/* 进度条 */}
          <div style={{
            width: '100%', height: 8, borderRadius: 4,
            background: C.bg, overflow: 'hidden', marginBottom: 8,
          }}>
            <div style={{
              width: `${displayProgress}%`, height: '100%',
              borderRadius: 4,
              background: `linear-gradient(90deg, ${levelColor}, ${levelColor}80)`,
              transition: 'width 0.6s ease',
            }} />
          </div>

          {level < 5 && nextLevel ? (
            <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>
              再获得 <strong style={{ color: levelColor }}>{nextThreshold - score}</strong> 积分即可升级为 <strong style={{ color: LEVEL_COLORS[nextLevel.level] }}>L{nextLevel.level} {nextLevel.label}</strong>
            </p>
          ) : (
            <p style={{ fontSize: 12, color: C.gold, margin: 0 }}>已达最高等级，千古巨匠之名永载史册 ✦</p>
          )}

          {/* 积分获取方式 */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 16,
            flexWrap: 'wrap', fontSize: 12, color: C.textDim,
          }}>
            <span>✦ 上架资产 +10</span>
            <span>✦ 资产售出 +20</span>
            <span>✦ 收到好评 +5</span>
            <span>✦ 共享免费资产 +3</span>
            <span>✦ 完成委托 +15</span>
          </div>
        </div>

        {/* ===== 数据概览 ===== */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12, marginBottom: 24,
        }}>
          {[
            { label: '信誉积分', value: score, suffix: '分', color: levelColor },
            { label: '社区贡献', value: profile?.totalContributions ?? 0, suffix: '项', color: C.blue },
            { label: '累计售出', value: profile?.totalSales ?? 0, suffix: '件', color: C.gold },
            { label: '创作者评价', value: profile?.avgRating ?? 0, suffix: `(${profile?.ratingCount ?? 0}人)`, color: C.purple },
            { label: '资产挂牌', value: profile?.activeListings ?? 0, suffix: '个', color: C.success },
            { label: '共享资产', value: profile?.sharedAssets ?? 0, suffix: '个', color: C.blue },
            { label: '共享资产', value: profile?.sharedAssets ?? 0, suffix: '个', color: C.blue },
            { label: '已购资产', value: purchases.length, suffix: '件', color: C.textSec },
          ].map((stat, i) => (
            <div key={i} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: 14, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: C.textDim }}>{stat.suffix}</div>
            </div>
          ))}
        </div>

        {/* ===== 当前等级权限 ===== */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: '0 0 16px', fontWeight: 500 }}>
            L{level} 已解锁权限
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(profile ? (() => {
              // Dynamically gather permissions from level hierarchy
              const perms: string[] = [];
              for (const l of LEVELS) {
                if (l.level <= level) {
                  const levelPerms = {
                    0: ['personal_create', 'join_campaign'],
                    1: ['share_asset', 'rate_others', 'create_commission', 'public_free'],
                    2: ['sell_asset', 'max_price_500'],
                    3: ['sell_module', 'unlimited_price', 'arbitrate'],
                    4: ['fund_vote', 'featured_slot'],
                    5: ['custom_royalty', 'advisor'],
                  }[l.level] || [];
                  perms.push(...levelPerms);
                }
              }
              return Array.from(new Set(perms));
            })() : []).map((perm: string) => (
              <span key={perm} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12,
                background: levelColor + '12', color: levelColor,
                border: `1px solid ${levelColor}20`,
              }}>
                ✓ {PERMISSION_LABELS[perm] || perm}
              </span>
            ))}
          </div>
        </div>

        {/* ===== 全等级一览 ===== */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: '0 0 16px', fontWeight: 500 }}>
            等级进阶表
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textDim, fontWeight: 400 }}>等级</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textDim, fontWeight: 400 }}>称号</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: C.textDim, fontWeight: 400 }}>所需积分</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textDim, fontWeight: 400 }}>解锁功能</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((l) => {
                  const isCurrent = l.level === level;
                  const isUnlocked = l.level <= level;
                  const lColor = LEVEL_COLORS[l.level];
                  return (
                    <tr key={l.level} style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: isCurrent ? lColor + '06' : 'transparent',
                    }}>
                      <td style={{ padding: '10px 12px', color: isUnlocked ? lColor : C.textDim, fontWeight: isCurrent ? 600 : 400 }}>
                        {isCurrent ? '▶ ' : ''}L{l.level}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: isUnlocked ? lColor : C.textDim }}>
                          {l.icon} {l.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: isUnlocked ? C.text : C.textDim }}>
                        {l.score.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', color: isUnlocked ? C.textSec : C.textDim }}>
                        <span style={{ fontSize: 12 }}>
                          {({
                            0: '创建角色、加入战役',
                            1: '共享资产、评价、发布委托',
                            2: '上架资产，最高 500 SEED',
                            3: '上架模组、无限定价、仲裁',
                            4: '基金投票、精选位',
                            5: '自定义版税、顾问资格',
                          }[l.level] || '—')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== 我的挂牌 ===== */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, color: C.text, margin: 0, fontWeight: 500 }}>我的市场活动</h2>
            <Link href="/rpg/market"
              style={{ fontSize: 13, color: C.gold, textDecoration: 'none' }}>
              管理市场 →
            </Link>
          </div>

          {listings.length === 0 && purchases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>还没有市场活动</p>
              <p style={{ fontSize: 12 }}>去跑团市场逛逛，或者上架你的作品</p>
              <Link href="/rpg/market"
                style={{
                  display: 'inline-block', marginTop: 12, padding: '6px 16px', borderRadius: 6,
                  background: C.goldDim + '20', border: `1px solid ${C.goldDim}`,
                  color: C.gold, textDecoration: 'none', fontSize: 13,
                }}>
                前往市场
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {listings.slice(0, 5).map((item: any) => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 6, background: C.bg,
                }}>
                  <div>
                    <span style={{ fontSize: 13, color: C.text }}>{item.char_name || item.lore_name || '未命名'}</span>
                    <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8 }}>
                      {item.status === 'active' ? '🟢 出售中' : item.status === 'sold' ? '🔴 已售出' : '⚪ 已下架'}
                    </span>
                  </div>
                  <span style={{ color: C.gold, fontSize: 13 }}>{item.price} 🌱</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部导航 */}
        <div style={{
          marginTop: 32, padding: '20px 0',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'center', gap: 16,
        }}>
          <Link href="/rpg" style={{ color: C.textDim, textDecoration: 'none', fontSize: 13 }}>← 返回酒馆</Link>
          <Link href="/rpg/market" style={{ color: C.textDim, textDecoration: 'none', fontSize: 13 }}>跑团市场</Link>
          <Link href="/rpg/fund" style={{ color: C.textDim, textDecoration: 'none', fontSize: 13 }}>创作者基金</Link>
        </div>
      </div>
    </div>
  );
}
