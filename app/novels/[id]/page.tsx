import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNovelMeta, getNovelChapters, getAllNovelIds } from '@/lib/novels';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return getAllNovelIds().map(id => ({ id }));
}

export default async function NovelDetailPage({ params }: Props) {
  const { id } = await params;
  const novel = getNovelMeta(id);
  
  if (!novel) {
    notFound();
  }

  const chapters = getNovelChapters(id);
  const chaptersDir = chapters.filter(c => c.meta.branch === 'main');
  
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let isFavorite = false;
  let userId = null;
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      userId = payload.userId;
      const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND novel_id = ?')
        .get(userId, id);
      isFavorite = !!fav;
    }
  }

  const likeResult = db.prepare('SELECT COUNT(*) as count FROM novel_likes WHERE novel_id = ?')
    .get(id) as { count: number };

  return (
    <div className="min-h-screen pb-8">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/novels" className="text-2xl">📚</Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white truncate max-w-xs">
              {novel.title}
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/novels" className="text-gray-600 dark:text-gray-300">返回列表</Link>
            {userId ? (
              <span className={`px-4 py-2 rounded-lg ${isFavorite ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                {isFavorite ? '❤️ 已收藏' : '🤍 收藏'}
              </span>
            ) : (
              <Link href="/auth/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                登录后收藏
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg sticky top-24">
              <div className="aspect-[3/4] bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-8xl">📖</span>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{novel.title}</h2>
              <p className="text-indigo-600 dark:text-indigo-400 mt-1">{novel.author || 'AI创作'}</p>
              
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <span>📖 {chapters.length}章</span>
                <span>❤️ {likeResult.count}点赞</span>
              </div>

              <div className="mt-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                  novel.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {novel.status === 'completed' ? '已完结' : '连载中'}
                </span>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mt-4 text-sm">
                {novel.description || '暂无简介'}
              </p>

              {chaptersDir.length > 0 && (
                <Link href={`/novels/${id}/${chaptersDir[0].filePath}`}
                  className="block w-full mt-6 py-3 bg-indigo-600 text-white text-center rounded-lg hover:bg-indigo-700 transition">
                  开始阅读
                </Link>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b dark:border-gray-700">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">📑 目录</h3>
              </div>
              
              <div className="divide-y dark:divide-gray-700">
                {chaptersDir.map((chapter, index) => (
                  <Link key={chapter.filePath}
                    href={`/novels/${id}/${chapter.filePath}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-gray-800 dark:text-white font-medium">{chapter.meta.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {chapter.content?.length || 0} 字
                        </p>
                      </div>
                    </div>
                    {chapter.meta.choices && chapter.meta.choices.length > 0 && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">
                        🔀 有分支
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {chaptersDir.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p>暂无章节</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
