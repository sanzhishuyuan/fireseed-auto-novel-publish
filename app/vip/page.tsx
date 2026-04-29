'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function VIPPage() {
  const [showNotice, setShowNotice] = useState(false);

  const plans = [
    {
      name: '免费用户',
      price: '¥0',
      period: '',
      features: ['免费阅读主线章节', '基础阅读设置', '章节点赞'],
      color: 'gray',
      button: '当前身份',
      available: true,
      action: 'free'
    },
    {
      name: '高级会员',
      price: '¥9.9',
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
      action: 'monthly'
    },
    {
      name: '年度会员',
      price: '¥99',
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
      action: 'yearly'
    }
  ];

  const handlePlanClick = (action: string) => {
    if (action === 'monthly') {
      // 高级会员先跳转到登录
      window.location.href = '/auth/login?redirect=/vip';
    } else {
      setShowNotice(true);
    }
  };

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
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>会员中心</h1>
          </div>
          <Link href="/novels" className="btn-ghost text-sm">返回阅读</Link>
        </div>
      </header>

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
                  <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{plan.price}</span>
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
                  onClick={() => handlePlanClick(plan.action)}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium ${
                    plan.popular ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {plan.button}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
            { q: '如何开通会员？', a: '点击上方「立即开通」按钮登录后即可开通。会员系统正在上线中，敬请期待。' },
            { q: '会员权益何时生效？', a: '支付成功后，权益将立即生效，刷新页面即可体验。' },
            { q: '支持哪些支付方式？', a: '目前支持微信支付、支付宝等主流支付方式。' },
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
