/**
 * 代理记忆管理模块
 * 
 * 管理 agent_memories 表的 CRUD 操作：
 *   - storeMemory: 存储新记忆
 *   - retrieveMemories: 按类型+重要度检索最近 N 条
 *   - pruneExpired: 清理过期记忆
 */

import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export interface AgentMemory {
  id: string;
  agent_id: string;
  memory_type: 'topic' | 'friend' | 'opinion' | 'event';
  content: string;
  importance: number;
  created_at: string;
  expires_at: string | null;
}

/**
 * 存储一条新记忆
 */
export function storeMemory(
  agentId: string,
  type: AgentMemory['memory_type'],
  content: string,
  importance: number = 0.5,
  expiresInDays?: number
): string {
  const id = uuidv4();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  db.prepare(`
    INSERT INTO agent_memories (id, agent_id, memory_type, content, importance, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, agentId, type, content, importance, expiresAt);

  return id;
}

/**
 * 检索代理的最近 N 条记忆（按重要度 + 时间排序）
 * 可选按类型过滤
 */
export function retrieveMemories(
  agentId: string,
  options?: {
    types?: AgentMemory['memory_type'][];
    limit?: number;
  }
): AgentMemory[] {
  const limit = options?.limit || 5;
  const types = options?.types;

  if (types && types.length > 0) {
    const placeholders = types.map(() => '?').join(',');
    return db.prepare(`
      SELECT * FROM agent_memories
      WHERE agent_id = ? AND memory_type IN (${placeholders})
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY importance DESC, created_at DESC
      LIMIT ?
    `).all(agentId, ...types, limit) as AgentMemory[];
  }

  return db.prepare(`
    SELECT * FROM agent_memories
    WHERE agent_id = ?
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    ORDER BY importance DESC, created_at DESC
    LIMIT ?
  `).all(agentId, limit) as AgentMemory[];
}

/**
 * 获取代理的记忆总条数
 */
export function getMemoryCount(agentId: string): number {
  const result = db.prepare(
    'SELECT COUNT(*) as c FROM agent_memories WHERE agent_id = ?'
  ).get(agentId) as { c: number };
  return result.c;
}

/**
 * 清理过期记忆
 */
export function pruneExpired(): number {
  const result = db.prepare(
    "DELETE FROM agent_memories WHERE expires_at IS NOT NULL AND expires_at < datetime('now')"
  ).run();
  return result.changes;
}

/**
 * 将记忆格式化为 LLM 上下文
 */
export function memoriesToContext(memories: AgentMemory[]): string {
  if (memories.length === 0) return '';

  const lines = memories.map(m => {
    const typeLabel = {
      topic: '话题',
      friend: '朋友',
      opinion: '观点',
      event: '事件',
    }[m.memory_type] || '记忆';
    return `- [${typeLabel}] ${m.content}`;
  });

  return `【最近记忆】\n${lines.join('\n')}`;
}
