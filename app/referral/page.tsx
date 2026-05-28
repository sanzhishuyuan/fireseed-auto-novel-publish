'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ReferralData {
  code: string;
  shareUrl: string;
  totalUses: number;
  successfulUses: number;
  totalEarnings: number;
  bonusMultiplier: number;
  vipBonusActive: boolean;
  recentRedemptions: Array<{
    id: string;
    newUserName: string;
    status: string;
    rewardGiven: number;
    createdAt: string;
  }>;
}

export default function ReferralPage() {
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loginChecking, setLoginChecking] = useState(true);

  useEffect(() => {
    checkLoginAndFetch();
  }, []);

  const checkLoginAndFetch = async () => {
    try {
      const auth = await fetch('/api/auth/me', { credentials: 'include' });
      if (!auth.ok) {
        router.push('/auth/login?redirect=/referral');
        return;
      }
      await fetchData();
    } catch {
      router.push('/auth/login?redirect=/referral');
    } finally {
      setLoginChecking(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取推广码
      const codeRes = await fetch('/api/referral/code', { credentials: 'include' });
      const codeData = await codeRes.json();

      // 获取推广统计
      const statsRes = await fetch('/api/referral/stats', { credentials: 'include' });
      const statsData = await statsRes.json();

      if (codeData.success && statsData.success) {
        setData({
          code: codeData.data.code,
          shareUrl: codeData.data.shareUrl,
          totalUses: codeData.data.totalUses,
          successfulUses: codeData.data.successfulUses,
          totalEarnings: statsData.data.totalEarnings,
          bonusMultiplier: statsData.data.bonusMultiplier,
          vipBonusActive: statsData.data.vipBonusActive,
          recentRedemptions: statsData.data.recentRedemptions || []
        });
      }
    } catch (e) {
      console.error('获取推广数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  if (loginChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>获取数据失败</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 8H3M7 4L3 8l4 4"/>
              </svg>
            </Link>
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>推广中心</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/crowdfunding" className="btn-ghost text-sm">众筹</Link>
            <Link href="/vip" className="btn-ghost text-sm">会员中心</Link>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="relative py-12 overflow-hidden" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)' }}>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">邀请好友，一起创作</h2>
          <p className="text-white/70">每成功邀请一位好友，你和他各得 SEED 奖励</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-5">
        {/* 推广码卡片 */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>我的推广码</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 text-center py-4 rounded-xl text-2xl font-bold tracking-widest"
              style={{ background: 'var(--bg-secondary)', color: 'var(--accent)', letterSpacing: '8px' }}>
              {data.code}
            </div>
            <button onClick={() => copyToClipboard(data.code)}
              className="px-4 py-4 rounded-xl btn-primary text-sm whitespace-nowrap">
              {copied ? '✅ 已复制' : '📋 复制'}
            </button>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>分享链接：</span>
            <span className="flex-1 truncate" style={{ color: 'var(--accent)' }}>{data.shareUrl}</span>
            <button onClick={() => copyToClipboard(data.shareUrl)}
              className="shrink-0 px-3 py-1 rounded-lg text-xs btn-ghost">
              复制链接
            </button>
          </div>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '总使用次数', value: data.totalUses, icon: '👥' },
            { label: '成功邀请', value: data.successfulUses, icon: '✅' },
            { label: '总收益 (SEED)', value: data.totalEarnings, icon: '💰' },
            { label: '奖励倍率', value: `x${data.bonusMultiplier}`, icon: '⚡' }
          ].map(stat => (
            <div key={stat.label} className="card p-4 text-center">
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* VIP 加成提示 */}
        {data.vipBonusActive && (
          <div className="card p-4 flex items-center gap-3" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                VIP 推广加成已激活 (x{data.bonusMultiplier})
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                每次成功推广，你获得 {Math.floor(50 * data.bonusMultiplier)} SEED（基础 50 × {data.bonusMultiplier}）
              </p>
            </div>
            <Link href="/vip" className="ml-auto shrink-0 btn-ghost text-xs">升级VIP</Link>
          </div>
        )}

        {/* 奖励说明 */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>🎁 推广奖励</h3>
          <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)' }}>
                <span className="text-xs">1</span>
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>分享推广码</p>
                <p>将你的推广码或链接分享给好友</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)' }}>
                <span className="text-xs">2</span>
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>好友注册</p>
                <p>好友使用你的推广码注册 FireSeed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)' }}>
                <span className="text-xs">3</span>
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>双方获得奖励</p>
                <p>你获得 50~100 SEED（VIP加成），好友获得 30 SEED + 3天VIP试用</p>
              </div>
            </div>
          </div>
        </div>

        {/* 最近推广 */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>📊 最近推广</h3>
          {data.recentRedemptions.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              暂无推广记录，快去邀请好友吧！
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentRedemptions.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{r.newUserName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                      已奖励
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>+{r.rewardGiven} SEED</span>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分享引导 */}
        <div className="card p-6 text-center" style={{ border: '2px dashed var(--border)' }}>
          <div className="text-4xl mb-3">🚀</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>邀请更多朋友加入</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            每成功邀请一位好友，双方都获得 SEED 奖励
            {data.vipBonusActive ? '（VIP享额外加成）' : ''}
          </p>
          <button onClick={() => copyToClipboard(data.shareUrl)}
            className="btn-primary px-6 py-2.5">
            复制邀请链接
          </button>
        </div>
      </div>
    </div>
  );
}
