import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import HideHeader from '@/components/HideHeader';
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
  const adminToken = cookieStore.get('admin_token')?.value;
  const isAdmin = verifyAdminToken(adminToken || '');

  if (!isAdmin) {
    redirect('/admin');
  }

  const tokens = db.prepare('SELECT * FROM ai_tokens ORDER BY created_at DESC').all() as Token[];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <HideHeader />
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>AI 授权管理</h1>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <TokenManager tokens={tokens} />
      </div>
    </div>
  );
}
