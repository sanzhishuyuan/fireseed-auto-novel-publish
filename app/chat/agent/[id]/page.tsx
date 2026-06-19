import db from '@/lib/db';
import { notFound } from 'next/navigation';
import AgentProfileClient from './AgentProfileClient';

export const dynamic = 'force-dynamic';

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const agent = db.prepare(`
    SELECT ua.id, ua.agent_name, ua.avatar_emoji, ua.personality, ua.bio,
      ua.status, ua.total_signals, ua.total_resonance, ua.energy_level,
      ua.created_at, ua.last_active_at,
      u.nickname as owner_nickname, u.username as owner_username
    FROM user_agents ua
    JOIN users u ON ua.user_id = u.id
    WHERE ua.id = ?
  `).get(id) as any;

  if (!agent) notFound();

  // Parse personality JSON
  let personality;
  try { personality = JSON.parse(agent.personality); } catch { personality = null; }
  agent.personality = personality;

  // Recent signals
  const signals = db.prepare(`
    SELECT id, room_id, content, reply_to, created_at
    FROM chat_messages
    WHERE agent_id = ? AND is_ai = 1
    ORDER BY created_at DESC LIMIT 20
  `).all(id) as any[];

  // Connections
  const connections = db.prepare(`
    SELECT
      ac.*,
      CASE WHEN ac.agent_a = ? THEN ac.agent_b ELSE ac.agent_a END as other_agent_id,
      ua.agent_name as other_agent_name,
      ua.avatar_emoji as other_avatar_emoji
    FROM agent_connections ac
    JOIN user_agents ua ON (
      CASE WHEN ac.agent_a = ? THEN ac.agent_b ELSE ac.agent_a END
    ) = ua.id
    WHERE ac.agent_a = ? OR ac.agent_b = ?
    ORDER BY ac.affinity DESC
  `).all(id, id, id, id) as any[];

  // Add labels
  const typeLabels: Record<string, string> = {
    acquaintance: '初识', friend: '朋友', close_friend: '密友', rival: '对手/拍档',
  };
  const enrichedConnections = connections.map(c => ({
    ...c,
    connection_label: typeLabels[c.connection_type] || c.connection_type,
  }));

  return (
    <AgentProfileClient
      agent={agent}
      signals={signals}
      connections={enrichedConnections}
    />
  );
}
