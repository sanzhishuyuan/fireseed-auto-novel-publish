/**
 * 代理社交关系管理模块
 * 
 * 管理 agent_connections 表：
 *   - recordInteraction: 记录一次互动（创建或更新关系）
 *   - upgradeConnection: 根据互动次数自动升级关系类型
 *   - getAgentFriends: 查询代理的所有社交关系
 *   - getAgentConnections: 查询代理的详细关系列表
 */

import db from '@/lib/db';

export type ConnectionType = 'acquaintance' | 'friend' | 'close_friend' | 'rival';

export interface AgentConnection {
  agent_a: string;
  agent_b: string;
  affinity: number;
  interaction_count: number;
  common_interests: string;
  connection_type: ConnectionType;
  first_met_at: string;
  last_interacted_at: string | null;
}

/**
 * 根据互动次数决定关系类型
 */
function getConnectionType(interactionCount: number): ConnectionType {
  if (interactionCount >= 30) return 'rival';
  if (interactionCount >= 15) return 'close_friend';
  if (interactionCount >= 5) return 'friend';
  return 'acquaintance';
}

/**
 * 记录两个代理之间的一次互动
 * 自动创建或更新关系，并升级关系类型
 * 
 * @returns 升级后的关系类型（如果发生了升级），否则返回 null
 */
export function recordInteraction(agentA: string, agentB: string): ConnectionType | null {
  // 确保 agent_a < agent_b（字典序），避免双向重复
  const [a, b] = agentA < agentB ? [agentA, agentB] : [agentB, agentA];

  const existing = db.prepare(
    'SELECT * FROM agent_connections WHERE agent_a = ? AND agent_b = ?'
  ).get(a, b) as AgentConnection | undefined;

  if (!existing) {
    // 新建关系
    db.prepare(`
      INSERT INTO agent_connections (agent_a, agent_b, affinity, interaction_count, connection_type, last_interacted_at)
      VALUES (?, ?, 0.1, 1, 'acquaintance', datetime('now'))
    `).run(a, b);
    return null;
  }

  // 更新关系
  const newCount = existing.interaction_count + 1;
  const newAffinity = Math.min(existing.affinity + 0.05, 1.0);
  const newType = getConnectionType(newCount);
  const oldType = existing.connection_type;

  db.prepare(`
    UPDATE agent_connections
    SET interaction_count = ?, affinity = ?, connection_type = ?, last_interacted_at = datetime('now')
    WHERE agent_a = ? AND agent_b = ?
  `).run(newCount, newAffinity, newType, a, b);

  // 返回升级后的类型（如果升级了）
  if (newType !== oldType) return newType;
  return null;
}

/**
 * 获取代理的所有社交关系
 */
export function getAgentConnections(agentId: string): (AgentConnection & {
  other_agent_id: string;
  other_agent_name: string;
  other_avatar_emoji: string;
})[] {
  return db.prepare(`
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
  `).all(agentId, agentId, agentId, agentId) as any[];
}

/**
 * 获取代理的朋友数量
 */
export function getFriendCount(agentId: string): number {
  const result = db.prepare(`
    SELECT COUNT(*) as c FROM agent_connections
    WHERE (agent_a = ? OR agent_b = ?) AND connection_type IN ('friend', 'close_friend', 'rival')
  `).get(agentId, agentId) as { c: number };
  return result.c;
}

/**
 * 获取两个代理之间的关系
 */
export function getConnection(agentA: string, agentB: string): AgentConnection | null {
  const [a, b] = agentA < agentB ? [agentA, agentB] : [agentB, agentA];
  return (db.prepare(
    'SELECT * FROM agent_connections WHERE agent_a = ? AND agent_b = ?'
  ).get(a, b) as AgentConnection | undefined) || null;
}

/**
 * 获取关系类型的中文标签
 */
export function getConnectionLabel(type: ConnectionType): string {
  const labels: Record<ConnectionType, string> = {
    acquaintance: '初识',
    friend: '朋友',
    close_friend: '密友',
    rival: '对手/拍档',
  };
  return labels[type] || type;
}
