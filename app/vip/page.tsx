import { getVIPMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: getVIPMetadata().title,
  description: getVIPMetadata().description,
  keywords: getVIPMetadata().keywords?.join(', '),
};

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Plan {
  name: string;
  price: number;
  period: string;
  features: string[];
  color: string;
  popular?: boolean;
  button: string;
  available: boolean;
  action: string;
  vipType: string;
}

interface VipStatus {
  vipType: string;
  isVipActive: boolean;
  vipExpiresAt: string | null;
  vipAutoRenew: boolean;
  benefits: Array<{
    key: string;
    value: string;
    description: string;
  }>;
  subscription: any;
}

export default function VIPPage() {
  const router = useRouter();
  const [showNotice, setShowNotice] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('seed');
  const [payInfo, setPayInfo] = useState<{ orderNo: string; amount: number; qrCodeUrl?: string; payUrl?: string; payTip?: string } | null>(null);

  const plans: Plan[] = [
    {
      name: '免费用户',
      price: 0,
      period: '',
      features: ['免费阅读主线章节', '基础阅读设置', '章节点赞'],
      color: 'gray',
      button: '当前身份',
      available: true,
      action: 'free',
      vipType: 'free'
    },
    {
      name: '高级会员',
      price: 9.9,
      period: '/月',
      features: [
        '解锁全部分支剧情',
        '无广告阅读体验',
        '专属阅读主题',
        '优先阅读新章节',
        '无限收藏'
      ],
      color: 'indigo',
      popular: true,
      button: '立即开通',
      available: true,
      action: 'monthly',
      vipType: 'monthly'
    },
    {
      name: '年度会员',
      price: 99,
      period: '/年',
      features: [
        '高级会员全部权益',
        '解锁付费章节',
        '专属身份标识',
        '年度专属活动',
        '专属创作投票权'
      ],
      color: 'purple',
      button: '超值之选',
      available: true,
      action: 'yearly',
      vipType: 'yearly'
    }
  ];

  // 获取 VIP 状态
  useEffect(() => {
    fetchVipStatus();
  }, []);

  const fetchVipStatus = async () => {
    try {
      const res = await fetch('/api/vip/status', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVipStatus(data.data);
        }
      }
    } catch (error) {
      console.error('获取VIP状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanClick = async (plan: Plan) => {
    if (plan.action === 'free') {
      return;
    }

    // 检查登录状态
    try {
      const authRes = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });

      if (!authRes.ok) {
        router.push('/auth/login?redirect=/vip');
        return;
      }
    } catch (error) {
      router.push('/auth/login?redirect=/vip');
      return;
    }

    // 开始订阅
    setProcessing(plan.action);
    setPayInfo(null);

    try {
      const res = await fetch('/api/vip/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          planType: plan.action,
          paymentMethod: selectedMethod
        })
      });

      const data = await res.json();

      if (data.success) {
        if (data.data.paid) {
          alert(`🎉 订阅成功！${plan.name} 已激活。`);
          fetchVipStatus();
        } else {
          setPayInfo({
            orderNo: data.data.orderNo,
            amount: data.data.amount,
            qrCodeUrl: data.data.qrCodeUrl,
            payUrl: data.data.payUrl,
            payTip: data.data.payTip
          });
        }
      } else {
        alert(`订阅失败: ${data.error}`);
      }
    } catch (error) {
      console.error('订阅失败:', error);
      alert('订阅失败，请稍后重试');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      {/* Banner */}
      <div
        className="relative py-16 sm:py-20 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)' }}
      >
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20" style={{ background: 'white' }} />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-10" style={{ background: 'white' }} />

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
              <path d="M6 1L7.5 4.5H11L8.25 6.75L9.5 10.5L6 8L2.5 10.5L3.75 6.75L1 4.5H4.5L6 1Z"/>
            </svg>
            <span className="text-white/90 text-xs font-medium">会员专属权益</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            解锁完整故事世界
          </h2>
          <p className="text-white/80 max-w-xl mx-auto">
            升级会员，探索每一条隐藏支线，体验完整的故事宇宙
          </p>

          {/* 当前 VIP 状态 */}
          {vipStatus && vipStatus.isVipActive && (
            <div className="mt-6 inline-block px-6 py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <p className="text-white font-medium">
                🎉 您当前是 {vipStatus.vipType === 'monthly' ? '高级会员' : '年度会员'}
              </p>
              <p className="text-white/80 text-sm mt-1">
                到期时间: {formatDate(vipStatus.vipExpiresAt)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 定价卡片 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8">
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="card overflow-hidden"
              style={plan.popular ? { border: '2px solid var(--accent)', transform: 'scale(1.02)' } : {}}
            >
              {plan.popular && (
                <div className="text-center py-2.5 text-sm font-medium" style={{ background: 'var(--accent)', color: 'white' }}>
                  最受欢迎
                </div>
              )}
              <div className="p-6">
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {plan.name}
                </h3>
                <div className="mb-5">
                  <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                    ¥{plan.price}
                  </span>
                  {plan.period && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>}
                </div>
                <div className="divider" />
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#10b981" strokeWidth="1.5" className="mt-0.5 shrink-0">
                        <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePlanClick(plan)}
                  disabled={processing === plan.action || !!((vipStatus && vipStatus.vipType === plan.vipType && vipStatus.isVipActive) as boolean)}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium ${
                    plan.popular ? 'btn-primary' : 'btn-secondary'
                  } ${processing === plan.action ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {processing === plan.action
                    ? '处理中...'
                    : vipStatus && vipStatus.vipType === plan.vipType && vipStatus.isVipActive
                    ? '当前套餐'
                    : plan.button
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 支付方式选择 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-8">
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>选择支付方式</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'seed', label: 'SEED 代币', icon: '🌱', desc: '余额支付', available: true },
              { id: 'wechat', label: '微信支付', icon: '💚', desc: '即将上线', available: false },
              { id: 'alipay', label: '支付宝', icon: '💙', desc: '即将上线', available: false },
              { id: 'simulate', label: '模拟支付', icon: '🔬', desc: '开发测试', available: true },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => m.available && setSelectedMethod(m.id)}
                disabled={!m.available}
                className={`p-3 rounded-lg text-center transition-all ${
                  !m.available ? 'opacity-50 cursor-not-allowed' :
                  selectedMethod === m.id
                    ? 'ring-2 ring-indigo-500 bg-indigo-500/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="text-xl mb-1">{m.icon}</div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 支付弹窗 */}
      {payInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="card max-w-sm w-full p-6 text-center animate-fade-in">
            <div className="text-4xl mb-4">
              {selectedMethod === 'wechat' ? '💚' : selectedMethod === 'alipay' ? '💙' : '🖼️'}
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              请完成支付
            </h3>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              {payInfo.payTip || '支付中...'}
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              订单号: {payInfo.orderNo}
            </p>
            <div className="flex flex-col gap-3">
              {/* 支付二维码模拟 */}
              <div className="mx-auto w-48 h-48 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-center">
                  <div className="text-5xl mb-2">📱</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    扫码支付 ¥{(payInfo.amount / 100).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setPayInfo(null)} className="flex-1 btn-secondary py-2.5">
                  取消支付
                </button>
                <button
                  onClick={async () => {
                    // 模拟支付回调
                    const res = await fetch('/api/payment/callback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderNo: payInfo.orderNo, status: 'success' })
                    });
                    if (res.ok) {
                      alert('🎉 支付成功！VIP 已激活');
                      setPayInfo(null);
                      fetchVipStatus();
                    }
                  }}
                  className="flex-1 btn-primary py-2.5"
                >
                  模拟支付成功
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                正式环境将接入微信/支付宝 SDK
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 提示弹窗 */}
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card max-w-sm w-full p-6 animate-fade-in">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>会员功能即将上线</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                会员系统正在开发中，请关注后续更新。注册后可第一时间收到通知。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNotice(false)}
                  className="flex-1 btn-secondary"
                >
                  知道了
                </button>
                <Link href="/auth/register" className="flex-1 btn-primary text-center">
                  立即注册
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-16">
        <h3 className="text-xl font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
          常见问题
        </h3>
        <div className="space-y-3">
          {[
            { q: '如何开通会员？', a: '登录后点击上方「立即开通」按钮，选择支付方式即可开通。目前支持 SEED 代币支付，微信/支付宝即将上线。' },
            { q: '会员权益何时生效？', a: '支付成功后，权益将立即生效，刷新页面即可体验。' },
            { q: '支持哪些支付方式？', a: '目前支持 SEED 代币支付（使用平台内 SEED 余额）。微信支付和支付宝正在对接中，预计近期上线。' },
            { q: '可以退款吗？', a: '虚拟商品一经购买不支持退款，感谢理解。' }
          ].map((item, i) => (
            <div key={i} className="card p-5">
              <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{item.q}</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
