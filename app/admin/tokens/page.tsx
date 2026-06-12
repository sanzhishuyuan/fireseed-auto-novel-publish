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
    <div className="min-h-screen" style={{ background: '#0b0b0f' }}>
      <HideHeader />
      <header className="sticky top-0 z-50" style={{ background: 'rgba(11,11,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,165,92,0.12)', border: '1px solid rgba(201,165,92,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#c9a55c" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: '#f0ece4', fontFamily: "'Fraunces', Georgia, serif" }}>AI 授权管理</h1>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <TokenManager tokens={tokens} />
      </div>
    </div>
  );
}
