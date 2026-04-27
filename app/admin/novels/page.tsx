import { cookies } from 'next/headers';
import { ADMIN_PASSWORD } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllNovelIds, getNovelMeta } from '@/lib/novels';
import NovelEditor from './NovelEditor';

export const dynamic = 'force-dynamic';

export default async function NovelsAdminPage() {
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">📝 小说管理</h1>
          <a href="/admin/dashboard" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
            返回后台
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <NovelEditor novels={novels} />
      </div>
    </div>
  );
}
