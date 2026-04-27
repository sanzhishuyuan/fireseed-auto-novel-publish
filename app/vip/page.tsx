import Link from 'next/link';

export default function VIPPage() {
  const plans = [
    {
      name: '普通会员',
      price: '免费',
      period: '',
      features: ['免费阅读主线章节', '每日5次收藏', '基础阅读设置', '章节点赞评论'],
      color: 'gray',
      button: '当前身份'
    },
    {
      name: '高级会员',
      price: '¥9.9',
      period: '/月',
      features: ['解锁全部支线章节', '无限收藏', '无广告阅读', '专属阅读主题', '优先阅读新章节', '专属客服支持'],
      color: 'indigo',
      popular: true,
      button: '立即开通'
    },
    {
      name: '年度会员',
      price: '¥99',
      period: '/年',
      features: ['高级会员全部权益', '解锁付费章节', '专属创作投票权', '年度专属活动', '专属身份标识', '年费赠礼'],
      color: 'purple',
      button: '超值之选'
    }
  ];

  return (
    <div className="min-h-screen pb-8">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">📚</Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">会员中心</h1>
          </div>
          <Link href="/novels" className="text-gray-600 dark:text-gray-300">
            返回阅读
          </Link>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">✨ 升级会员 畅享阅读</h2>
          <p className="text-lg opacity-90">
            解锁全部剧情支线、无广告沉浸体验、专属特权服务
          </p>
        </div>
      </div>

      {/* 定价卡片 */}
      <div className="max-w-5xl mx-auto px-4 -mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden ${
                plan.popular ? 'ring-2 ring-indigo-500 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="bg-indigo-600 text-white text-center py-2 text-sm font-medium">
                  ⭐ 最受欢迎
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-indigo-600">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-500">{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-lg font-semibold ${
                    plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {plan.button}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 常见问题 */}
      <div className="max-w-3xl mx-auto px-4 mt-16">
        <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-8">
          常见问题
        </h3>
        <div className="space-y-4">
          {[
            { q: '如何成为会员？', a: '点击上方"立即开通"按钮，选择支付方式完成支付即可。' },
            { q: '会员权益何时生效？', a: '支付成功后，权益将立即生效，可刷新页面查看。' },
            { q: '支持哪些支付方式？', a: '目前支持微信支付、支付宝等主流支付方式。' },
            { q: '可以退款吗？', a: '虚拟商品一经购买不支持退款，感谢理解。' }
          ].map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <h4 className="font-bold text-gray-800 dark:text-white mb-2">{item.q}</h4>
              <p className="text-gray-600 dark:text-gray-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 广告位 */}
      <div className="ad-container mx-4 my-8">
        📢 广告位
      </div>
    </div>
  );
}
