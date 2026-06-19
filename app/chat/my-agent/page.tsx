import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import MyAgentClient from './MyAgentClient';

export const dynamic = 'force-dynamic';

export default async function MyAgentPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;

  if (!authToken) redirect('/auth/login?redirect=/chat/my-agent');

  const decoded = verifyToken(authToken);
  if (!decoded) redirect('/auth/login?redirect=/chat/my-agent');

  const user = {
    userId: decoded.userId,
    username: decoded.username,
    nickname: decoded.nickname,
  };

  // 查询代理
  let agent = db.prepare(`
    SELECT * FROM user_agents WHERE user_id = ?
  `).get(user.userId) as any;

  if (!agent) {
    // 自动创建代理
    const { v4: uuidv4 } = await import('uuid');
    const agentId = uuidv4();
    const defaultName = `${user.nickname || user.username}的代理`;
    const defaultPersonality = JSON.stringify({
      genre_pref: 50, writing_focus: 50, tone: 50, creativity: 50, social: 50, picky: 50,
    });

    db.prepare(`
      INSERT INTO user_agents (id, user_id, agent_name, personality)
      VALUES (?, ?, ?, ?)
    `).run(agentId, user.userId, defaultName, defaultPersonality);

    agent = db.prepare('SELECT * FROM user_agents WHERE user_id = ?').get(user.userId);
  }

  // Parse personality
  if (agent) {
    try { agent.personality = JSON.parse(agent.personality); } catch {}
  }

  return <MyAgentClient user={user} agent={agent} />;
}
