'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHeaderConfig } from '@/components/HeaderContext';

// ============ 类型定义 ============
interface UserProfile {
  id: string; username: string; nickname?: string; email?: string; role: string;
  vipType: string; vipExpiresAt: string | null; createdAt: string;
}

interface WalletData {
  balance: number; total_earned: number; total_spent: number;
}

interface Transaction {
  id: string; type: string; amount: number; description: string; created_at: string;
}

interface VipStatus {
  vipType: string; isVipActive: boolean; vipExpiresAt: string | null;
  benefits: Array<{ key: string; value: string; description: string }>;
}

interface ReferralData {
  code: string; shareUrl: string; successfulUses: number; totalEarnings: number;
  bonusMultiplier: number; vipBonusActive: boolean;
}

// ============ 主组件 ============
type TabKey = 'overview' | 'vip' | 'wallet' | 'referral' | 'tokens' | 'settings' | 'tasks';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: '个人概览', icon: '📊' },
  { key: 'tasks', label: '我的任务', icon: '📋' },
  { key: 'vip', label: 'VIP 会员', icon: '💎' },
  { key: 'wallet', label: 'SEED 钱包', icon: '🌱' },
  { key: 'referral', label: '推广中心', icon: '🔗' },
  { key: 'tokens', label: 'API Token', icon: '🔑' },
  { key: 'settings', label: '账户设置', icon: '⚙️' },
];

const PLANS = [
  { name: '免费用户', vipType: 'free', price: 0, period: '' },
  { name: '高级会员', vipType: 'monthly', price: 9.9, period: '/月' },
  { name: '年度会员', vipType: 'yearly', price: 99, period: '/年' },
];

export default function MyDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginChecked, setLoginChecked] = useState(false);

  // 设置页面状态
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  interface TokenData {
    id: string; token: string; name: string; permissions: string[];
    created_at: string; last_used: string | null; is_active: number;
  }
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [copiedToken, setCopiedToken] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newToken, setNewToken] = useState({ name: '', permissions: ['create_novel', 'create_chapter'] });
  const [createdToken, setCreatedToken] = useState<{ id: string; token: string; name: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // VIP购买状态
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; msg: string } | null>(null);

  // 充值状态
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [recharging, setRecharging] = useState(false);

  // 隐藏全局 Header（此页面使用自定义内联 Header）
  const { setConfig } = useHeaderConfig();
  useEffect(() => { setConfig({ hideHeader: true }); return () => setConfig({}); }, [setConfig]);

  useEffect(() => {
    loadAllData();
  }, []);

  // 读取 URL 参数中的 tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && TABS.some(t => t.key === tabParam)) {
      setTab(tabParam as TabKey);
    }
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 检查登录
      const authRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!authRes.ok) {
        window.location.href = '/auth/login?redirect=/my';
        return;
      }
      setLoginChecked(true);
      const authData = await authRes.json();
      if (authData.success) setProfile(authData.data);

      // 加载 SEED 钱包
      const walletRes = await fetch('/api/seed/balance', { credentials: 'include' });
      if (walletRes.ok) {
        const wd = await walletRes.json();
        if (wd.success && wd.data) setWallet(wd.data);
      }

      // 加载交易记录
      const txRes = await fetch('/api/seed/transactions?limit=5', { credentials: 'include' });
      if (txRes.ok) {
        const txd = await txRes.json();
        if (txd.success) setTransactions(txd.data?.transactions || []);
      }

      // 加载 VIP 状态
      const vipRes = await fetch('/api/vip/status', { credentials: 'include' });
      if (vipRes.ok) {
        const vd = await vipRes.json();
        if (vd.success) setVipStatus(vd.data);
      }

      // 加载 API Tokens
      try {
        const tokenRes = await fetch('/api/ai/token', { credentials: 'include' });
        if (tokenRes.ok) {
          const td = await tokenRes.json();
          setTokens(td.tokens || []);
        }
      } catch {}

      // 初始化昵称和邮箱
      if (authData?.data) {
        setNickname(authData.data.nickname || authData.data.username || '');
        setEmail(authData.data.email || '');
      }

      // 加载推广数据
      const refRes = await fetch('/api/referral/code', { credentials: 'include' });
      if (refRes.ok) {
        const rd = await refRes.json();
        if (rd.success) {
          const statsRes = await fetch('/api/referral/stats', { credentials: 'include' });
          const sd = statsRes.ok ? await statsRes.json() : null;
          setReferralData({
            code: rd.data.code,
            shareUrl: rd.data.shareUrl,
            successfulUses: rd.data.successfulUses,
            totalEarnings: sd?.data?.totalEarnings || 0,
            bonusMultiplier: sd?.data?.bonusMultiplier || 1,
            vipBonusActive: sd?.data?.vipBonusActive || false,
          });
        }
      }
    } catch (e) {
      console.error('加载用户数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // ========== VIP 购买流程 ==========
  const handlePurchaseVIP = async (planType: string) => {
    setPurchasing(true);
    setPurchaseResult(null);
    try {
      const res = await fetch('/api/vip/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType, paymentMethod: 'seed' }),
      });
      const data = await res.json();
      if (data.success) {
        setPurchaseResult({ success: true, msg: `🎉 ${planType === 'monthly' ? '高级会员' : '年度会员'}订阅成功！` });
        loadAllData(); // 刷新数据
      } else {
        setPurchaseResult({ success: false, msg: data.error || '订阅失败' });
      }
    } catch {
      setPurchaseResult({ success: false, msg: '网络错误' });
    } finally {
      setPurchasing(false);
      setTimeout(() => setPurchaseResult(null), 4000);
    }
  };

  // ========== 充值流程 ==========
  const handleRecharge = async () => {
    setRecharging(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: rechargeAmount, paymentMethod: 'seed', description: '手动充值' }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.paid) {
          // SEED 即时到账
          alert(`✅ 充值成功！到账 ${rechargeAmount} SEED`);
          loadAllData();
        } else {
          alert(`🔗 支付链接: ${data.data.payUrl || data.data.qrCodeUrl || '待支付'}`);
        }
      } else {
        alert(data.error || '充值失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setRecharging(false);
    }
  };

  // ========== 昵称保存 ==========
  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      setSettingsMsg({ type: 'error', text: '昵称不能为空' });
      return;
    }
    if (nickname.trim().length > 30) {
      setSettingsMsg({ type: 'error', text: '昵称不能超过30个字符' });
      return;
    }
    setSavingNickname(true);
    setSettingsMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsMsg({ type: 'success', text: '昵称修改成功' });
        if (profile) setProfile({ ...profile, nickname: nickname.trim() });
      } else {
        setSettingsMsg({ type: 'error', text: data.error || '修改失败' });
      }
    } catch {
      setSettingsMsg({ type: 'error', text: '网络错误' });
    } finally {
      setSavingNickname(false);
      setTimeout(() => setSettingsMsg(null), 3000);
    }
  };

  // ========== 邮箱保存 ==========
  const handleSaveEmail = async () => {
    const trimmed = email.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setSettingsMsg({ type: 'error', text: '邮箱格式不正确' });
      return;
    }
    setSavingEmail(true);
    setSettingsMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed })
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsMsg({ type: 'success', text: '邮箱修改成功' });
        if (profile) setProfile({ ...profile, email: trimmed });
      } else {
        setSettingsMsg({ type: 'error', text: data.error?.message || data.error || '修改失败' });
      }
    } catch {
      setSettingsMsg({ type: 'error', text: '网络错误' });
    } finally {
      setSavingEmail(false);
      setTimeout(() => setSettingsMsg(null), 3000);
    }
  };

  // ========== Token 创建 ==========
  const handleCreateToken = async () => {
    const res = await fetch('/api/ai/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newToken)
    });
    if (res.ok) {
      const data = await res.json();
      setCreatedToken(data.token);
      loadAllData();
    } else {
      const data = await res.json();
      setTokenError(data.error || '创建失败');
    }
  };

  // ========== Token 删除 ==========
  const handleDeleteToken = async (id: string) => {
    if (!confirm('确定删除此 Token？删除后使用此 Token 的 AI 将无法再发布作品。')) return;
    const res = await fetch(`/api/ai/token?id=${id}`, { method: 'DELETE' });
    if (res.ok) loadAllData();
  };

  // ========== Token 复制 ==========
  const copyToken = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(id);
      setTimeout(() => setCopiedToken(''), 2000);
    } catch {}
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleString('zh-CN');
  };

  // ========== 加载中状态 ==========
  if (loading && !loginChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  // ========== 渲染内容 ==========
  const renderContent = () => {
    switch (tab) {
      case 'overview': return renderOverview();
      case 'tasks':
        router.push('/my/tasks');
        return null;
      case 'vip': return renderVIP();
      case 'wallet': return renderWallet();
      case 'referral': return renderReferral();
      case 'tokens': return renderTokens();
      case 'settings': return renderSettings();
    }
  };

  // ========== 页面渲染 ==========
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-lg" style={{ color: 'var(--accent)' }}>FireSeed</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {wallet && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <span>🌱</span>
                <span className="font-medium" style={{ color: 'var(--accent)' }}>{wallet.balance}</span>
              </span>
            )}
            {profile?.vipType && profile.vipType !== 'free' && (
              <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                {profile.vipType === 'monthly' ? '高级会员' : '年度会员'}
              </span>
            )}
            <Link href="/novels" className="btn-ghost text-xs">返回阅读</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* 侧边栏 */}
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="sticky top-20 space-y-1">
            {TABS.map(t => {
              if (t.key === 'tasks') {
                return (
                  <Link
                    key={t.key}
                    href="/my/tasks"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5 text-gray-400 hover:text-white"
                    style={{ textDecoration: 'none' }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    tab === t.key
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'hover:bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 移动端标签切换 */}
        <div className="md:hidden w-full overflow-x-auto mb-4">
          <div className="flex gap-2 pb-2">
            {TABS.map(t => {
              if (t.key === 'tasks') {
                return (
                  <Link
                    key={t.key}
                    href="/my/tasks"
                    className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium bg-white/5 text-gray-400`}
                    style={{ textDecoration: 'none' }}
                  >
                    {t.icon} {t.label}
                  </Link>
                );
              }
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium ${
                    tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 内容区 */}
        <main className="flex-1 min-w-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );

  // ============ 1. 个人概览 ============
  function renderOverview() {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>个人概览</h2>

        {/* 信息卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>账户</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile?.username}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>注册于 {profile?.createdAt ? formatDate(profile.createdAt) : ''}</div>
          </div>

          <div className="card p-5">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>SEED 余额</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{wallet?.balance || 0}</span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>🌱</span>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              总获得: {wallet?.total_earned || 0} | 总消费: {wallet?.total_spent || 0}
            </div>
            <button onClick={() => setTab('wallet')} className="text-xs mt-2 underline" style={{ color: 'var(--accent)' }}>查看明细 →</button>
          </div>

          <div className="card p-5">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>VIP 状态</div>
            {vipStatus?.isVipActive ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                    {vipStatus?.vipType === 'monthly' ? '高级会员' : '年度会员'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">有效</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  到期: {formatDate(vipStatus?.vipExpiresAt || null)}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>免费用户</div>
                <button onClick={() => setTab('vip')} className="text-xs mt-2 underline" style={{ color: 'var(--accent)' }}>开通会员 →</button>
              </>
            )}
          </div>
        </div>

        {/* 推广统计 */}
        {referralData && (
          <div className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  我的推广码: <span className="font-bold tracking-wider" style={{ color: 'var(--accent)' }}>{referralData.code}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  成功邀请 {referralData.successfulUses} 人 | 收益 {referralData.totalEarnings} SEED
                </div>
              </div>
            </div>
            <button onClick={() => setTab('referral')} className="btn-ghost text-xs">管理</button>
          </div>
        )}

        {/* 最近交易 */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>最近动态</h3>
            <button onClick={() => setTab('wallet')} className="text-xs" style={{ color: 'var(--accent)' }}>查看全部</button>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>暂无动态</div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{tx.description || tx.type}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(tx.created_at)}</div>
                  </div>
                  <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 🌱
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ 2. VIP 会员 ============
  function renderVIP() {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>VIP 会员</h2>

        {/* 当前 VIP 状态 */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                当前身份: {vipStatus?.isVipActive ? (
                  <span style={{ color: 'var(--accent)' }}>{vipStatus.vipType === 'monthly' ? '高级会员' : '年度会员'}</span>
                ) : '免费用户'}
              </div>
              {vipStatus?.isVipActive && (
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  有效期至: {formatDate(vipStatus.vipExpiresAt)}
                </div>
              )}
            </div>
            {!vipStatus?.isVipActive && (
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400">立即升级</span>
            )}
          </div>
        </div>

        {/* 购买结果提示 */}
        {purchaseResult && (
          <div className={`p-4 rounded-lg text-sm ${purchaseResult.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'}`}>
            {purchaseResult.msg}
          </div>
        )}

        {/* 套餐选择 */}
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = vipStatus?.isVipActive && vipStatus.vipType === plan.vipType;
            const isUpgrade = plan.vipType !== 'free';
            return (
              <div key={plan.vipType} className={`card p-5 ${isCurrent ? 'border-2 border-indigo-500' : ''}`}>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>¥{plan.price}</span>
                  {plan.period && <span className="text-sm text-gray-500">{plan.period}</span>}
                </div>
                {plan.vipType === 'monthly' && (
                  <ul className="text-xs space-y-1.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    <li>✅ 解锁全部分支剧情</li>
                    <li>✅ 无广告阅读</li>
                    <li>✅ 优先阅读新章节</li>
                    <li>✅ 推广奖励 x1.5</li>
                    <li>✅ 可发起众筹</li>
                  </ul>
                )}
                {plan.vipType === 'yearly' && (
                  <ul className="text-xs space-y-1.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    <li>✅ 高级会员全部权益</li>
                    <li>✅ 解锁付费章节</li>
                    <li>✅ 专属身份标识</li>
                    <li>✅ 推广奖励 x2</li>
                    <li>✅ 众筹优先推荐</li>
                  </ul>
                )}
                {plan.vipType === 'free' && (
                  <ul className="text-xs space-y-1.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    <li>✅ 免费阅读主线</li>
                    <li>✅ 基础设置</li>
                    <li>✅ 章节点赞</li>
                  </ul>
                )}
                {isUpgrade && (
                  <>
                    {isCurrent ? (
                      <div className="w-full py-2 rounded-lg text-sm font-medium text-center bg-green-500/10 text-green-500">
                        当前套餐
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchaseVIP(plan.vipType)}
                        disabled={purchasing}
                        className={`w-full py-2 rounded-lg text-sm font-medium ${
                          plan.vipType === 'monthly' ? 'btn-primary' : 'btn-secondary'
                        } ${purchasing ? 'opacity-50' : ''}`}
                      >
                        {purchasing ? '处理中...' : '立即开通（SEED支付）'}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* SEED 余额提示 */}
        <div className="card p-4 flex items-center gap-3" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="text-xl">🌱</span>
          <div className="flex-1">
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
              当前 SEED 余额: <span className="font-bold" style={{ color: 'var(--accent)' }}>{wallet?.balance || 0}</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              VIP 订阅需要消耗 SEED，余额不足时请先 <button onClick={() => setTab('wallet')} className="underline" style={{ color: 'var(--accent)' }}>充值</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ 3. SEED 钱包 ============
  function renderWallet() {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>SEED 钱包</h2>

        {/* 余额卡片 */}
        <div className="card p-6 text-center" style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)' }}>
          <div className="text-white/70 text-sm mb-1">SEED 余额</div>
          <div className="text-4xl font-bold text-white mb-2">{wallet?.balance || 0}</div>
          <div className="text-white/60 text-xs">
            总获得: {wallet?.total_earned || 0} | 总消费: {wallet?.total_spent || 0}
          </div>
        </div>

        {/* 充值区域 */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>充值 SEED</h3>
          <div className="flex gap-2 mb-3">
            {[50, 100, 200, 500, 1000].map(amt => (
              <button key={amt} onClick={() => setRechargeAmount(amt)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                  rechargeAmount === amt ? 'btn-primary' : 'btn-secondary'
                }`}>{amt}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="number" className="input flex-1" value={rechargeAmount}
              onChange={e => setRechargeAmount(parseInt(e.target.value) || 0)} min={10} />
            <button onClick={handleRecharge} disabled={recharging || rechargeAmount < 10}
              className="btn-primary px-6 py-2.5 whitespace-nowrap">
              {recharging ? '充值中...' : '立即充值'}
            </button>
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            充值后 SEED 可用于：VIP订阅、支持众筹、点赞收藏等
          </div>
        </div>

        {/* 交易记录 */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>交易记录</h3>
            <Link href="/seed/stats" className="text-xs" style={{ color: 'var(--accent)' }}>统计报表 →</Link>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>暂无交易记录</div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${tx.amount > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                    <div>
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{tx.description || tx.type}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(tx.created_at)}</div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/seed/stats" className="block text-center text-xs mt-3 underline" style={{ color: 'var(--accent)' }}>
            查看完整统计 →
          </Link>
        </div>
      </div>
    );
  }

  // ============ 4. 推广中心 ============
  function renderReferral() {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>推广中心</h2>

        {referralData && (
          <>
            {/* 推广码 */}
            <div className="card p-5 text-center">
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>我的推广码</div>
              <div className="text-3xl font-bold tracking-widest mb-3" style={{ color: 'var(--accent)', letterSpacing: '8px' }}>
                {referralData.code}
              </div>
              <button onClick={() => {
                navigator.clipboard.writeText(referralData.shareUrl);
                alert('✅ 推广链接已复制！');
              }} className="btn-primary px-5 py-2 text-sm">
                复制推广链接
              </button>
              {referralData.vipBonusActive && (
                <div className="mt-3 text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  ⚡ VIP 推广加成 x{referralData.bonusMultiplier}
                </div>
              )}
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '成功邀请', value: referralData.successfulUses, icon: '👥' },
                { label: '总收益', value: referralData.totalEarnings, icon: '💰' },
                { label: '奖励倍率', value: `x${referralData.bonusMultiplier}`, icon: '⚡' },
              ].map(s => (
                <div key={s.label} className="card p-4 text-center">
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{s.value}</div>
                  <div className="text-xs mt-1 text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* 推广规则 */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>推广奖励规则</h3>
              <div className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
                <p>• 你获得 <strong style={{ color: 'var(--accent)' }}>50 SEED</strong>（VIP最高可翻倍至 100）</p>
                <p>• 好友获得 <strong style={{ color: 'var(--accent)' }}>30 SEED + 3天VIP试用</strong></p>
                <p>• 好友使用你的推广码 <strong>{referralData.code}</strong> 注册即生效</p>
              </div>
            </div>
          </>
        )}

        {!referralData && (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
            加载中...
          </div>
        )}
      </div>
    );
  }

  // ============ 5. API Token ============
  function renderTokens() {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>AI 写作 Token</h2>

        {/* 🎁 免费 Token 领取信息栏 */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎁</span>
              <h3 className="font-bold text-white text-base">免费大模型 API Token 领取</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">NEW</span>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-lg shrink-0 mt-0.5">🔥</span>
                <div>
                  <p className="font-medium text-white">SiliconCloud 全平台通用代金券 16 元</p>
                  <p className="text-xs mt-1 text-white/60">完成实名认证即可领取。免费调用 deepseek / qwen / glm5 等全品类大模型</p>
                  <a href="https://cloud.siliconflow.cn/i/lQsiPTpO" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline underline-offset-2 hover:text-white transition-colors"
                    style={{ color: '#60a5fa' }}>
                    立即领取 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l6-6M5 3h4v4"/>
                    </svg>
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-lg shrink-0 mt-0.5">🧠</span>
                <div>
                  <p className="font-medium text-white">智谱 BigModel GLM-5：注册即送 2000 万 Tokens</p>
                  <p className="text-xs mt-1 text-white/60">智谱新一代旗舰模型 GLM-5，推理、代码、智能体综合能力开源模型 SOTA。通过邀请链接注册即可领取 2000 万 Tokens 大礼包</p>
                  <a href="https://www.bigmodel.cn/invite?icode=x70Xu1tg5DvILXe%2FQUZWIA%3D%3D" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline underline-offset-2 hover:text-white transition-colors"
                    style={{ color: '#60a5fa' }}>
                    立即注册领取 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l6-6M5 3h4v4"/>
                    </svg>
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-lg shrink-0 mt-0.5">🤖</span>
                <div>
                  <p className="font-medium text-white">腾讯 IMA：解锁 Copilot 功能，创建专属知识伙伴</p>
                  <p className="text-xs mt-1 text-white/60">通过推荐链接解锁 IMA Copilot 功能，创建专属知识伙伴，并获得 500 免费算力</p>
                  <a href="https://ima.qq.com/copilot-invite-reward-token/assist/V_5sR6zTzuz6W0wf8qLMng" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline underline-offset-2 hover:text-white transition-colors"
                    style={{ color: '#60a5fa' }}>
                    立即领取 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l6-6M5 3h4v4"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <p className="text-xs mt-3 text-white/40">⏰ 活动有效期至 2026 年 12 月 31 日</p>
          </div>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>管理用于 AI 写作助手的授权令牌</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            + 创建 Token
          </button>
        </div>

        {/* 创建 Token */}
        {showCreate && !createdToken && (
          <div className="card p-5">
            <h3 className="font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>创建新 Token</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Token 名称</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                  className="input w-full"
                  placeholder="例如：我的写作助手"
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>权限</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newToken.permissions.includes('create_novel')}
                      onChange={(e) => {
                        if (e.target.checked) setNewToken({ ...newToken, permissions: [...newToken.permissions, 'create_novel'] });
                        else setNewToken({ ...newToken, permissions: newToken.permissions.filter(p => p !== 'create_novel') });
                      }}
                      className="rounded" />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>创建作品</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newToken.permissions.includes('create_chapter')}
                      onChange={(e) => {
                        if (e.target.checked) setNewToken({ ...newToken, permissions: [...newToken.permissions, 'create_chapter'] });
                        else setNewToken({ ...newToken, permissions: newToken.permissions.filter(p => p !== 'create_chapter') });
                      }}
                      className="rounded" />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>发布章节</span>
                  </label>
                </div>
              </div>
              {tokenError && (
                <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400">{tokenError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreateToken} className="btn-primary px-6 py-2 text-sm">创建</button>
                <button onClick={() => { setShowCreate(false); setTokenError(null); }}
                  className="px-6 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 显示新创建的 Token */}
        {createdToken && (
          <div className="rounded-xl p-5" style={{ background: 'rgba(16,185,129,0.08)' }}>
            <h3 className="font-bold text-base mb-3" style={{ color: '#10b981' }}>Token 创建成功！</h3>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>请立即复制保存，关闭后将无法再次查看此 Token。</p>
            <div className="rounded-lg p-3 break-all font-mono text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
              {createdToken.token}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => copyToken(createdToken.token, createdToken.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                复制 Token
              </button>
              <button onClick={() => { setCreatedToken(null); setShowCreate(false); }}
                className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                完成
              </button>
            </div>
          </div>
        )}

        {/* Token 列表 */}
        <div className="card overflow-hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>我的 Token</h3>
          </div>
          {tokens.map((token) => (
            <div key={token.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{token.name}</span>
                    <span className={"px-2 py-0.5 rounded text-xs " + (token.is_active
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-gray-500/10 text-gray-500'
                    )}>
                      {token.is_active ? '启用' : '禁用'}
                    </span>
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    权限: {token.permissions?.join(', ') || '无'}
                  </div>
                  <div className="text-xs mt-1 opacity-60" style={{ color: 'var(--text-muted)' }}>
                    创建于 {formatDate(token.created_at)}
                    {token.last_used ? ` | 最后使用 ${formatDate(token.last_used)}` : ' | 从未使用'}
                  </div>
                  {/* 显示 Token 密钥(可复制) */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 rounded-lg px-3 py-1.5 font-mono text-xs break-all select-all"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
                      {token.token}
                    </div>
                    <button
                      onClick={() => copyToken(token.token, token.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{
                        background: copiedToken === token.id ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)',
                        color: copiedToken === token.id ? '#10b981' : 'var(--text-muted)'
                      }}
                    >
                      {copiedToken === token.id ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteToken(token.id)}
                  className="ml-3 shrink-0 px-3 py-1 rounded text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {tokens.length === 0 && !showCreate && (
            <div className="p-8 text-center">
              <p style={{ color: 'var(--text-muted)' }}>暂无 Token</p>
              <p className="text-sm mt-1 opacity-60" style={{ color: 'var(--text-muted)' }}>创建 Token 后，AI 写作助手可以使用它来发布作品到你的账号</p>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
          <h3 className="font-medium mb-2" style={{ color: '#60a5fa' }}>使用说明</h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>• Token 用于授权 AI 写作助手访问你的账号</li>
            <li>• 每个 Token 都可以独立管理权限</li>
            <li>• 建议为不同的 AI 助手创建不同的 Token</li>
            <li>• 删除 Token 后，使用该 Token 的 AI 将无法再发布作品</li>
          </ul>
        </div>
      </div>
    );
  }

  // ============ 6. 账户设置（合并原个人设置页） ============
  function renderSettings() {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>账户设置</h2>

        {/* 头像 + 基本信息 */}
        <div className="card p-5">
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white' }}
            >
              {(profile?.nickname || profile?.username || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {profile?.nickname || profile?.username}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                @{profile?.username} · {profile?.role === 'admin' || profile?.role === 'super_admin' ? '管理员' : '普通用户'}
              </p>
            </div>
          </div>

          {/* 昵称编辑 */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              显示昵称
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input flex-1"
                placeholder="输入你的昵称"
                maxLength={30}
              />
              <button
                onClick={handleSaveNickname}
                disabled={savingNickname}
                className="btn-primary px-6 py-2 text-sm whitespace-nowrap"
              >
                {savingNickname ? '保存中...' : '保存'}
              </button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              昵称将代替用户名在网站上显示，1-30个字符
            </p>
          </div>

          {/* 邮箱编辑 */}
          <div className="mt-5">
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              注册邮箱
            </label>
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input flex-1"
                placeholder="输入你的邮箱地址"
              />
              <button
                onClick={handleSaveEmail}
                disabled={savingEmail}
                className="btn-primary px-6 py-2 text-sm whitespace-nowrap"
              >
                {savingEmail ? '保存中...' : '保存'}
              </button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              邮箱可用于登录验证和接收通知，选填
            </p>
          </div>

          {/* 消息提示 */}
          {settingsMsg && (
            <div
              className="mt-3 p-3 rounded-lg text-sm flex items-center gap-2"
              style={{
                background: settingsMsg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                color: settingsMsg.type === 'success' ? '#10b981' : '#ef4444'
              }}
            >
              {settingsMsg.text}
            </div>
          )}
        </div>

        {/* 账户信息 */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>账户信息</h3>
          <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex justify-between">
              <span>用户名</span>
              <span style={{ color: 'var(--text-primary)' }}>{profile?.username}</span>
            </div>
            <div className="flex justify-between">
              <span>注册邮箱</span>
              <span style={{ color: 'var(--text-primary)' }}>{profile?.email || '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span>角色</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {profile?.role === 'admin' || profile?.role === 'super_admin' ? '管理员' : profile?.role === 'editor' ? '编辑' : '普通用户'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>注册时间</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {profile?.createdAt ? formatDateTime(profile.createdAt) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* API Token - 快捷入口 */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>API Token</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                当前 {tokens.length} 个 Token · 用于 AI 创作
              </p>
            </div>
            <button onClick={() => setTab('tokens')}
              className="text-xs underline underline-offset-2" style={{ color: 'var(--accent)' }}>
              管理 Token
            </button>
          </div>
        </div>
      </div>
    );
  }
}
