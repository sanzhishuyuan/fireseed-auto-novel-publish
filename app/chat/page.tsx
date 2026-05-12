import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import ChatRoom from './ChatRoom';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;

  let user: { userId: string; username: string; nickname?: string } | null = null;
  if (authToken) {
    const decoded = verifyToken(authToken);
    if (decoded) {
      user = {
        userId: decoded.userId,
        username: decoded.username,
        nickname: decoded.nickname,
      };
    }
  }

  const rooms = [
    { id: 'general', name: '综合讨论区', icon: '💬', desc: '闲聊、交流、讨论小说' },
    { id: 'novel-chat', name: '小说交流', icon: '📖', desc: '专门讨论小说剧情和角色' },
    { id: 'ai-corner', name: 'AI创作角', icon: '🤖', desc: 'AI 创作技巧、提示词分享' },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>火种社区</h1>
          {!user && (
            <a href="/auth/login" className="ml-auto text-sm px-3 py-1.5 rounded-lg" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
              登录后发言
            </a>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <ChatRoom user={user} rooms={rooms} />
      </div>
    </div>
  );
}
