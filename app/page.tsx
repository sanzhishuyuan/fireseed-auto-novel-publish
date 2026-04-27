import Link from 'next/link';
import { getAllNovelIds, getNovelMeta } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const novelIds = getAllNovelIds();
  
  const novels = novelIds.map(id => ({
    id,
    ...getNovelMeta(id)
  })).filter(n => n.title);

  return (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            📚 AI小说平台
          </h1>
          <nav className="flex items-center gap-4">
            <Link href="/novels" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600">
              小说列表
            </Link>
            <Link href="/auth/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              登录
            </Link>
          </nav>
        </div>
      </header>

      {/* 开屏广告位 */}
      <div className="ad-container mx-4 mt-4 hidden md:block">
        <span>📢 广告位：开屏横幅广告 728x90</span>
      </div>

      {/* 特色功能介绍 */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          ✨ 平台特色
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">AI智能创作</h3>
            <p className="text-gray-600 dark:text-gray-400">
              采用先进AI技术，自动生成精彩剧情，支持多种风格题材
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">🌳</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">多分支剧情</h3>
            <p className="text-gray-600 dark:text-gray-400">
              你的选择决定故事走向，每条支线都是全新体验
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">沉浸阅读</h3>
            <p className="text-gray-600 dark:text-gray-400">
              移动端优化体验，支持个性化阅读设置，护眼模式
            </p>
          </div>
        </div>
      </section>

      {/* 热门小说 */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">🔥 热门小说</h2>
          <Link href="/novels" className="text-indigo-600 hover:text-indigo-700">
            查看全部 →
          </Link>
        </div>
        
        {novels.length > 0 ? (
          <div className="grid md:grid-cols-4 gap-6">
            {novels.map((novel) => (
              <Link 
                key={novel.id} 
                href={`/novels/${novel.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-4xl">📖</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                    {novel.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {novel.author || '未知作者'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2">
                    {novel.description || '暂无简介'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-6xl mb-4">📚</p>
            <p>暂无小说，管理员正在创作中...</p>
            <Link href="/admin" className="text-indigo-600 hover:underline mt-2 inline-block">
              进入创作后台
            </Link>
          </div>
        )}
      </section>

      {/* 会员服务 */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">💎 升级会员 畅享更多</h2>
          <p className="text-lg mb-6 opacity-90">
            解锁全部支线章节、无广告阅读、专属创作特权
          </p>
          <Link 
            href="/vip"
            className="inline-block px-8 py-3 bg-white text-indigo-600 rounded-full font-semibold hover:bg-gray-100 transition"
          >
            了解会员权益
          </Link>
        </div>
      </section>

      {/* 底部广告 */}
      <div className="ad-container mx-4 my-8">
        <span>📢 广告位：底部横幅广告 728x90</span>
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-800 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© 2024 AI小说平台 - 智能创作 · 互动阅读</p>
          <p className="mt-2 text-sm">
            <Link href="/admin" className="hover:text-white">管理后台</Link>
            {' · '}
            <span>基于 Next.js + SQLite 构建</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
