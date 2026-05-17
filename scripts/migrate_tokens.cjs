/**
 * scripts/migrate_tokens.cjs
 * 统一 user_tokens + ai_tokens → tokens 表
 * 新增 token_usage_logs 审计表（如果不存在）
 *
 * 用法: node scripts/migrate_tokens.cjs
 */
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'novel.db');
let db;
try {
  db = new Database(DB_PATH);
} catch (e) {
  console.error('❌ 无法打开数据库:', e.message);
  process.exit(1);
}

db.pragma('journal_mode = WAL');

console.log('🔧 开始 Token 表迁移...\n');

// === Step 1: 创建统一 tokens 表（如果不存在） ===
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
`);

// 创建索引
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token)`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id)`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_token_logs_token ON token_usage_logs(token_id)`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_token_logs_time ON token_usage_logs(created_at)`); } catch {}

// === Step 2: 检查旧表是否存在，迁移数据 ===
let migrated = 0;
let aiMigrated = 0;

// 检查 user_tokens 表
const hasUserTokens = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='user_tokens'"
).get();

if (hasUserTokens) {
  const userTokens = db.prepare('SELECT * FROM user_tokens').all();
  for (const t of userTokens) {
    const exists = db.prepare('SELECT id FROM tokens WHERE id = ?').get(t.id);
    if (exists) continue;

    db.prepare(`
      INSERT OR IGNORE INTO tokens (id, user_id, type, token, name, permissions, last_used_at, is_active, created_at)
      VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)
    `).run(
      t.id, t.user_id, t.token, t.name || '迁移:user_token',
      t.permissions || '["create_novel","create_chapter"]',
      t.last_used, t.is_active, t.created_at
    );
    migrated++;
  }
  console.log(`  ✅ 迁移 user_tokens: ${migrated} 条`);
} else {
  console.log('  📭 user_tokens 表不存在，跳过');
}

// 检查 ai_tokens 表
const hasAiTokens = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='ai_tokens'"
).get();

if (hasAiTokens) {
  const aiTokens = db.prepare('SELECT * FROM ai_tokens').all();
  for (const t of aiTokens) {
    const exists = db.prepare('SELECT id FROM tokens WHERE token = ?').get(t.token);
    if (exists) continue;

    db.prepare(`
      INSERT OR IGNORE INTO tokens (id, user_id, type, token, name, permissions, quota_day, quota_used, quota_reset_at, last_used_at, is_active, created_at)
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
} else {
  console.log('  📭 ai_tokens 表不存在，跳过');
}

// === Step 3: 统计 ===
const totalTokens = db.prepare('SELECT COUNT(*) as c FROM tokens').get();
const typeCount = db.prepare('SELECT type, COUNT(*) as c FROM tokens GROUP BY type').all();

console.log(`\n📊 迁移后统计:`);
console.log(`  tokens 总数: ${totalTokens.c}`);
for (const row of typeCount) {
  console.log(`    ${row.type}: ${row.c} 个`);
}

db.close();
console.log('\n✅ Token 表迁移完成！');
