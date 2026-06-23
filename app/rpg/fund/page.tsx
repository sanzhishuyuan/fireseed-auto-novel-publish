'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: 'var(--codex-bg)', card: 'var(--codex-bg-card)', border: 'var(--codex-border)',
  gold: 'var(--codex-gold)', goldDim: 'var(--codex-gold)',
  text: 'var(--codex-text)', textSec: 'var(--codex-text-dim)', textDim: 'var(--codex-text-muted)',
  danger: 'var(--codex-red)', success: 'var(--codex-green)', purple: 'var(--codex-purple)', blue: 'var(--codex-blue)',
};

const ALLOCATION_RULES = [
  { ratio: '40%', label: '创作大赛奖池', desc: '用于定期举办的创作大赛，奖励优秀作品', color: '#c9a55c', amountKey: 'contestPool' },
  { ratio: '30%', label: '新创作者扶持', desc: '奖励达到 L2~L3 的新锐创作者', color: '#22c55e', amountKey: 'newCreatorPool' },
  { ratio: '20%', label: '顾问津贴', desc: 'L4 传说工匠 / L5 千古巨匠 的月度津贴', color: '#a78bfa', amountKey: 'advisorPool' },
  { ratio: '10%', label: '储备金', desc: '留作储备，用于突发事件或特殊激励', color: '#60a5fa', amountKey: 'reservePool' },
];

const TX_LABEL: Record<string, string> = {
  rpg_purchase: '市场交易',
  rpg_gm_interact: 'AI GM 消耗',
  rpg_fund_reward: '基金分配',
  rpg_commission_pub: '委托发布',
  rpg_commission_pay: '委托付款',
};

export default function CreatorFundPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFund();
  }, []);

  const loadFund = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rpg/fund');
      if (!res.ok) { setError('加载失败'); return; }
      const d = await res.json();
      if (d.success) setData(d.data);
      else setError(d.error || '加载失败');
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
        <div className="max-w-3xl mx-auto px-4 py-12">
          {[1, 2, 3, 4].map(i => (
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
          <button onClick={loadFund}
            style={{ padding: '8px 20px', borderRadius: 6, background: C.goldDim + '20', border: `1px solid ${C.goldDim}`, color: C.gold, cursor: 'pointer', fontSize: 14 }}>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  const d = data || {};

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 面包屑 */}
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 24 }}>
          <Link href="/rpg" style={{ color: C.textDim, textDecoration: 'none' }}>雾隐酒馆</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: C.textSec }}>创作者基金</span>
        </div>

        {/* ===== 基金总览 Hero ===== */}
        <div style={{
          background: `linear-gradient(135deg, var(--codex-gold-glow), var(--codex-bg-card))`,
          border: '1px solid var(--codex-border-gold)',
          borderRadius: 12, padding: 32, marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: C.goldDim, marginBottom: 8, letterSpacing: 2 }}>创作者基金</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: C.gold, marginBottom: 4, fontFamily: "'Fraunces', Georgia, serif" }}>
            {(d.platformBalance ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 14, color: C.textDim }}>🌱 SEED · 平台金库余额</div>

          <div style={{
            marginTop: 20, display: 'flex', justifyContent: 'center', gap: 8,
            flexWrap: 'wrap', fontSize: 12, color: C.textDim,
          }}>
            <span>每笔交易 5% 注入基金</span>
            <span>·</span>
            <span>每月初自动分配</span>
            <span>·</span>
            <span>支持创作生态循环</span>
          </div>
        </div>

        {/* ===== 月度经济仪表盘 ===== */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: '0 0 16px', fontWeight: 500 }}>
            本月经济概览
          </h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
          }}>
            {[
              { label: '市场交易额', value: (d.totalSales ?? 0).toLocaleString(), unit: '🌱', color: C.gold },
              { label: '交易笔数', value: d.totalTransactions ?? 0, unit: '笔', color: C.text },
              { label: 'GM 消耗', value: (d.totalGMIncome ?? 0).toLocaleString(), unit: '🌱', color: C.purple },
              { label: '预计基金注入', value: (d.projectedFund ?? 0).toLocaleString(), unit: '🌱', color: C.success },
            ].map((stat, i) => (
              <div key={i} style={{
                background: C.bg, borderRadius: 8, padding: 14, textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>{stat.unit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 基金分配规则 ===== */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: '0 0 16px', fontWeight: 500 }}>
            月度分配规则
          </h2>
          <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 20px', lineHeight: 1.6 }}>
            每月初，平台将上月累计的基金池按以下比例分配给社区。分配由系统自动执行，管理员可手动触发。
          </p>

          {/* 分配比例条 */}
          <div style={{
            display: 'flex', height: 32, borderRadius: 8, overflow: 'hidden',
            marginBottom: 20,
          }}>
            {ALLOCATION_RULES.map((rule, i) => (
              <div key={i} style={{
                flex: rule.ratio === '40%' ? 4 : rule.ratio === '30%' ? 3 : rule.ratio === '20%' ? 2 : 1,
                background: rule.color + '30',
                borderRight: i < ALLOCATION_RULES.length - 1 ? `1px solid ${C.bg}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: rule.color,
              }}>
                {rule.ratio}
              </div>
            ))}
          </div>

          {/* 分配详情 */}
          <div style={{ display: 'grid', gap: 12 }}>
            {ALLOCATION_RULES.map((rule, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 12px', borderRadius: 8, background: C.bg,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: rule.color + '20', color: rule.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>
                  {rule.ratio}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 2 }}>{rule.label}</div>
                  <div style={{ fontSize: 12, color: C.textDim }}>{rule.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 分配历史 ===== */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: '0 0 16px', fontWeight: 500 }}>
            分配记录
          </h2>

          {(!d.recentDistributions || d.recentDistributions.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
              <p style={{ fontSize: 14, marginBottom: 4 }}>暂无分配记录</p>
              <p style={{ fontSize: 12 }}>基金池将在达到 100 SEED 后开始首次月度分配</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {d.recentDistributions.map((tx: any, i: number) => (
                <div key={tx.id || i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 6, background: C.bg,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>🎁</span>
                    <div>
                      <div style={{ fontSize: 13, color: C.text }}>
                        {tx.description || TX_LABEL[tx.type] || '基金分配'}
                      </div>
                      <div style={{ fontSize: 11, color: C.textDim }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleString('zh-CN') : '—'}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 600,
                    color: tx.amount > 0 ? C.success : C.danger,
                  }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount ?? 0} 🌱
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== 基金说明 ===== */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24,
        }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: '0 0 12px', fontWeight: 500 }}>
            基金运作机制
          </h2>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: C.gold }}>资金来源</strong> — 每笔付费资产交易金额的 5%、AI GM 消耗的 10% 自动注入创作者基金。
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: C.gold }}>分配周期</strong> — 每月 1 日系统自动分配上月累积的基金池，管理员也可手动触发。
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: C.gold }}>分配方向</strong> — 40% 用于创作大赛奖池、30% 扶持新创作者（L2~L3）、20% 作为高级创作者顾问津贴（L4~L5）、10% 留作储备。
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: C.gold }}>透明度</strong> — 所有分配记录均上链记录，可在本页追溯查看。
            </p>
          </div>
        </div>

        {/* 底部导航 */}
        <div style={{
          marginTop: 32, padding: '20px 0',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'center', gap: 16,
        }}>
          <Link href="/rpg" style={{ color: C.textDim, textDecoration: 'none', fontSize: 13 }}>← 返回酒馆</Link>
          <Link href="/rpg/market" style={{ color: C.textDim, textDecoration: 'none', fontSize: 13 }}>跑团市场</Link>
          <Link href="/rpg/creator" style={{ color: C.textDim, textDecoration: 'none', fontSize: 13 }}>创作者中心</Link>
        </div>
      </div>
    </div>
  );
}
