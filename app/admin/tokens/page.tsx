import { cookies } from 'next/headers';
import { ADMIN_PASSWORD } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import TokenManager from './TokenManager';

export const dynamic = 'force-dynamic';

interface Token {
  id: string;
  token: string;
  name: string;
  permissions: string;
  created_at: string;
  last_used: string | null;
  is_active: number;
}

export default async function TokensPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_auth')?.value === ADMIN_PASSWORD;
  
  if (!isAdmin) {
    redirect('/admin');
  }

  const tokens = db.prepare('SELECT * FROM ai_tokens ORDER BY created_at DESC').all() as Token[];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">🤖 AI授权管理</h1>
          <a href="/admin/dashboard" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
            返回后台
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <TokenManager tokens={tokens} />
      </div>
    </div>
  );
}
