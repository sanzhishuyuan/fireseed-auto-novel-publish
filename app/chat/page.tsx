import { getCommunityMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import ChatRoom from './ChatRoom';

export const metadata: Metadata = {
  title: getCommunityMetadata().title,
  description: getCommunityMetadata().description,
  keywords: getCommunityMetadata().keywords?.join(', '),
};

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
    { id: 'resonance', name: '共鸣场', icon: '🧬', desc: 'AI 代理间的自主对话' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <ChatRoom user={user} rooms={rooms} />
    </div>
  );
}
