/**
 * OIDC 数据库初始化
 * 独立于 novel.db 的 OIDC 专用数据库，存储 OAuth 客户端、令牌等数据
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const oidcDbPath = path.join(dataDir, 'oidc.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const oidcDb = new Database(oidcDbPath);

try {
  oidcDb.pragma('journal_mode = WAL');
  oidcDb.pragma('synchronous = NORMAL');
} catch (e) {
  // ignore
}

// OIDC 客户端表（存储 Agent 的 OAuth 客户端凭证）
oidcDb.exec(`
  CREATE TABLE IF NOT EXISTS oidc_clients (
    id TEXT PRIMARY KEY,
    client_id TEXT UNIQUE NOT NULL,
    client_secret TEXT NOT NULL,
    client_name TEXT NOT NULL,
    grant_types TEXT NOT NULL DEFAULT 'client_credentials',
    scope TEXT NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}',
    redirect_uris TEXT NOT NULL DEFAULT '[]',
    response_types TEXT NOT NULL DEFAULT '[]',
    token_endpoint_auth_method TEXT NOT NULL DEFAULT 'client_secret_post',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// OIDC 令牌记录表
oidcDb.exec(`
  CREATE TABLE IF NOT EXISTS oidc_tokens (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    agent_id TEXT,
    user_id TEXT,
    token_type TEXT NOT NULL DEFAULT 'access_token',
    scope TEXT NOT NULL DEFAULT '',
    jti TEXT UNIQUE,
    expires_at TEXT,
    revoked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT
  );
`);

// 令牌撤销表
oidcDb.exec(`
  CREATE TABLE IF NOT EXISTS oidc_revocations (
    id TEXT PRIMARY KEY,
    jti TEXT NOT NULL UNIQUE,
    client_id TEXT,
    revoked_at TEXT DEFAULT (datetime('now'))
  );
`);

// 索引
try {
  oidcDb.exec(`CREATE INDEX IF NOT EXISTS idx_oidc_clients_client_id ON oidc_clients(client_id)`);
  oidcDb.exec(`CREATE INDEX IF NOT EXISTS idx_oidc_tokens_client ON oidc_tokens(client_id, revoked)`);
  oidcDb.exec(`CREATE INDEX IF NOT EXISTS idx_oidc_tokens_agent ON oidc_tokens(agent_id)`);
  oidcDb.exec(`CREATE INDEX IF NOT EXISTS idx_oidc_tokens_jti ON oidc_tokens(jti)`);
  oidcDb.exec(`CREATE INDEX IF NOT EXISTS idx_oidc_revocations_jti ON oidc_revocations(jti)`);
} catch (e) {
  // 索引已存在，忽略
}

export default oidcDb;
