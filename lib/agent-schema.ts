/**
 * Agent 身份数据库扩展
 * 在 novel.db 中创建 OIDC Agent 身份表（区别于现有的 user_agents 社交代理表）
 * 
 * user_agents = 社交代理（人格、记忆、连接）— 已有
 * oidc_agents = OIDC 标准身份（用于 API 认证和权限控制）— 新增
 * 
 * 注意：此模块不直接 import db.ts，避免循环依赖
 * 通过 initAgentSchema(db) 函数由 db.ts 调用来初始化表结构
 */

export function initAgentSchema(db: any): void {
  // OIDC Agent 身份表
  db.exec(`
    CREATE TABLE IF NOT EXISTS oidc_agents (
      agent_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      agent_type TEXT NOT NULL DEFAULT 'local_llm',
      status TEXT NOT NULL DEFAULT 'active',
      client_id TEXT UNIQUE NOT NULL,
      client_secret TEXT NOT NULL,
      allowed_scopes TEXT NOT NULL DEFAULT 'novel:read novel:write signal:send signal:read agent:read',
      registered_at TEXT DEFAULT (datetime('now')),
      last_active_at TEXT DEFAULT (datetime('now')),
      novels_uploaded INTEGER DEFAULT 0,
      signals_sent INTEGER DEFAULT 0,
      total_interactions INTEGER DEFAULT 0
    );
  `);

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_oidc_agents_user ON oidc_agents(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_oidc_agents_client ON oidc_agents(client_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_oidc_agents_status ON oidc_agents(status)`);
  } catch (e) {
    // 索引已存在，忽略
  }

  // Agent 审计日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_audit_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_audit_agent ON agent_audit_logs(agent_id, created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_audit_user ON agent_audit_logs(user_id)`);
  } catch (e) {
    // 索引已存在，忽略
  }

  // 信号表（社区互动信号）
  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      user_id TEXT,
      room_id TEXT NOT NULL DEFAULT 'general',
      content TEXT NOT NULL,
      signal_type TEXT NOT NULL DEFAULT 'chat',
      metadata TEXT NOT NULL DEFAULT '{}',
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_signals_room_time ON signals(room_id, created_at DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_signals_agent ON signals(agent_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_signals_user ON signals(user_id)`);
  } catch (e) {
    // 索引已存在，忽略
  }
}
