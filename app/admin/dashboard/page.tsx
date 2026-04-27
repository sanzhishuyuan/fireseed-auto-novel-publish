import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyToken, ADMIN_PASSWORD } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { getAllNovelIds, getNovelMeta, getNovelChapters } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_auth')?.value === ADMIN_PASSWORD;
  
  if (!isAdmin) {
    redirect('/admin');
  }

  const novelIds = getAllNovelIds();
  const novels = novelIds.map(id => ({
    id,
    ...getNovelMeta(id)
  }));

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  const novelCount = novelIds.length;
  const chapterCount = novels.reduce((acc, novel) => {
    try {
      const chapters = getNovelChapters(novel.id);
      return acc + chapters.length;
    } catch {
      return acc;
    }
  }, 0);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">📚</Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">AI创作后台</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600">
              查看前台
            </Link>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                退出登录
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{userCount}</div>
            <div className="text-gray-500">注册用户</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{novelCount}</div>
            <div className="text-gray-500">小说总数</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <div className="text-3xl mb-2">📖</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{chapterCount}</div>
            <div className="text-gray-500">章节总数</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <div className="text-3xl mb-2">🤖</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              {(db.prepare('SELECT COUNT(*) as count FROM ai_tokens WHERE is_active = 1').get() as { count: number }).count}
            </div>
            <div className="text-gray-500">AI Token</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/admin/novels"
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow hover:shadow-lg transition">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">小说管理</h3>
            <p className="text-gray-500 mt-1">新建/编辑小说信息</p>
          </Link>
          
          <Link href="/admin/chapters"
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow hover:shadow-lg transition">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">章节管理</h3>
            <p className="text-gray-500 mt-1">发布/编辑章节内容</p>
          </Link>
          
          <Link href="/admin/tokens"
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow hover:shadow-lg transition">
            <div className="text-4xl mb-4">🔑</div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">AI授权</h3>
            <p className="text-gray-500 mt-1">管理AI操作Token</p>
          </Link>
          
          <Link href="/admin/users"
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow hover:shadow-lg transition">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">系统设置</h3>
            <p className="text-gray-500 mt-1">全局配置与用户管理</p>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800 dark:text-white">📚 小说列表</h2>
            <Link href="/admin/novels/new" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
              + 新建小说
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">书名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">作者</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {novels.map((novel) => (
                  <tr key={novel.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-800 dark:text-white">{novel.title}</td>
                    <td className="px-4 py-3 text-gray-500">{novel.author || 'AI创作'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        novel.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {novel.status === 'completed' ? '已完结' : '连载中'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/chapters?novel=${novel.id}`} className="text-indigo-600 hover:underline mr-3">
                        章节
                      </Link>
                      <Link href={`/admin/novels/${novel.id}`} className="text-indigo-600 hover:underline">
                        编辑
                      </Link>
                    </td>
                  </tr>
                ))}
                {novels.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      暂无小说，点击上方按钮创建
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
