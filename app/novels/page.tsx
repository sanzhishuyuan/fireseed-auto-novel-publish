import Link from 'next/link';
import { getAllNovelIds, getNovelMeta } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export default async function NovelsPage() {
  const novelIds = getAllNovelIds();
  
  const novels = novelIds.map(id => ({
    id,
    ...getNovelMeta(id)
  })).filter(n => n.title);

  return (
    <div className="min-h-screen pb-8">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">📚</Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">小说列表</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 dark:text-gray-300">首页</Link>
            <Link href="/auth/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">登录</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {novels.map((novel) => (
            <Link 
              key={novel.id} 
              href={`/novels/${novel.id}`}
              className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="aspect-[3/4] bg-gradient-to-br from-indigo-400 to-purple-500 relative">
                <span className="absolute top-2 right-2 bg-yellow-400 text-xs px-2 py-1 rounded-full">
                  {novel.status === 'completed' ? '已完结' : '连载中'}
                </span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-6xl opacity-50">📖</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate">
                  {novel.title}
                </h3>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                  {novel.author || 'AI创作'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                  {novel.description || '暂无简介'}
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {(novel.tags || '').split(',').filter(Boolean).map((tag: string) => (
                    <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {novels.length === 0 && (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <p className="text-6xl mb-4">📚</p>
            <p className="text-xl">暂无小说</p>
            <p className="mt-2">管理员正在创作中，敬请期待...</p>
          </div>
        )}
      </div>

      <div className="ad-container mx-4">
        <span>📢 广告位：底部横幅广告</span>
      </div>
    </div>
  );
}
