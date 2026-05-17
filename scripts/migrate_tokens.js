/**
 * scripts/migrate_tokens.js
 * 统一 user_tokens + ai_tokens → tokens 表
 * 新增 token_usage_logs 审计表
 *
 * 用法: node scripts/migrate_tokens.js
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'novel.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🔧 开始 Token 表迁移...\n');

// === Step 1: 创建统一 tokens 表 ===
db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id            TEXT PRIMARY KEY,
    user_id       TEXT,
    type          TEXT NOT NULL DEFAULT 'user',
    token         TEXT NOT NULL UNIQUE,
    name          TEXT,
    permissions   TEXT NOT NULL DEFAULT '[]',
    quota_day     INTEGER DEFAULT 50,
    quota_minute  INTEGER DEFAULT 10,
    quota_used    INTEGER DEFAULT 0,
    quota_reset_at TEXT,
    expires_at    TEXT,
    last_used_at  TEXT,
    last_ip       TEXT,
    environment   TEXT,
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS token_usage_logs (
    id          TEXT PRIMARY KEY,
    token_id    TEXT NOT NULL,
    user_id     TEXT,
    action      TEXT NOT NULL,
    ip          TEXT,
    user_agent  TEXT,
    status      INTEGER,
    duration_ms INTEGER,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);
  CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_token_logs_token ON token_usage_logs(token_id);
  CREATE INDEX IF NOT EXISTS idx_token_logs_time ON token_usage_logs(created_at);
`);

// === Step 2: 从旧表迁移数据 ===

// 迁移 user_tokens
const userTokens = db.prepare('SELECT * FROM user_tokens').all();
let migrated = 0;
for (const t of userTokens) {
  // 检查是否已迁移
  const exists = db.prepare('SELECT id FROM tokens WHERE id = ?').get(t.id);
  if (exists) continue;

  db.prepare(`
    INSERT INTO tokens (id, user_id, type, token, name, permissions, last_used_at, is_active, created_at)
    VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)
  `).run(
    t.id, t.user_id, t.token, t.name || '迁移:user_token',
    t.permissions || '["create_novel","create_chapter"]',
    t.last_used, t.is_active, t.created_at
  );
  migrated++;
}
console.log(`  ✅ 迁移 user_tokens: ${migrated} 条`);

// 迁移 ai_tokens
const aiTokens = db.prepare('SELECT * FROM ai_tokens').all();
let aiMigrated = 0;
for (const t of aiTokens) {
  // 已存在则跳过
  const exists = db.prepare('SELECT id FROM tokens WHERE token = ?').get(t.token);
  if (exists) continue;

  db.prepare(`
    INSERT INTO tokens (id, user_id, type, token, name, permissions, quota_day, quota_used, quota_reset_at, last_used_at, is_active, created_at)
    VALUES (?, NULL, 'developer', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    t.id, t.token, t.name || '迁移:ai_token',
    t.permissions || '["create_novel","create_chapter"]',
    t.quota_limit || 50, t.quota_used || 0,
    t.quota_reset_at, t.last_used, t.is_active, t.created_at
  );
  aiMigrated++;
}
console.log(`  ✅ 迁移 ai_tokens: ${aiMigrated} 条`);

// === Step 3: 创建视图兼容旧查询 ===
// 部分老代码用 user_tokens 表名查询，创建视图兼容
db.exec(`
  DROP VIEW IF EXISTS user_tokens_view;
  CREATE VIEW user_tokens_view AS
  SELECT id, user_id, token, name, permissions, last_used_at AS last_used, is_active, created_at
  FROM tokens WHERE type IN ('user', 'guest');
`);

// === Step 4: 验证 ===
const totalTokens = db.prepare('SELECT COUNT(*) as c FROM tokens').get();
const userTypeCount = db.prepare('SELECT type, COUNT(*) as c FROM tokens GROUP BY type').all();
console.log(`\n📊 迁移后统计:`);
console.log(`  tokens 总数: ${totalTokens.c}`);
for (const row of userTypeCount) {
  console.log(`    ${row.type}: ${row.c} 个`);
}

db.close();
console.log('\n✅ Token 表迁移完成！');
