/**
 * 迁移脚本：去掉 novel_likes 表的 UNIQUE(user_id, novel_id) 约束
 * 让用户可以反复点赞（打赏机制）
 *
 * 用法: node seed_migrate_like.js
 *       或 node seed_migrate_like.js /path/to/novel.db
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// 获取数据库路径
const dbPath = process.argv[2] || path.join(__dirname, 'data', 'novel.db');

if (!fs.existsSync(dbPath)) {
  console.error('❌ 数据库文件不存在:', dbPath);
  process.exit(1);
}

console.log('📦 数据库:', dbPath);
const db = new Database(dbPath);

try {
  // 检查当前表结构
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='novel_likes'").get();
  if (!tableInfo) {
    console.error('❌ novel_likes 表不存在');
    process.exit(1);
  }

  const currentSql = tableInfo.sql;
  console.log('📋 当前 DDL:', currentSql);

  // 如果已经去掉了 UNIQUE，跳过
  if (!currentSql.includes('UNIQUE')) {
    console.log('✅ novel_likes 表已经没有 UNIQUE 约束，无需迁移');
    process.exit(0);
  }

  // 检查是否有数据
  const count = db.prepare('SELECT COUNT(*) as c FROM novel_likes').get();
  console.log(`📊 现有 ${count.c} 条点赞记录`);

  // 执行迁移
  db.transaction(() => {
    // 1. 创建新表（无 UNIQUE 约束）
    db.prepare(`
      CREATE TABLE IF NOT EXISTS novel_likes_v2 (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        novel_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    console.log('✅ 创建临时表 novel_likes_v2');

    // 2. 复制数据
    const result = db.prepare('INSERT INTO novel_likes_v2 (id, user_id, novel_id, created_at) SELECT id, user_id, novel_id, created_at FROM novel_likes').run();
    console.log(`✅ 复制了 ${result.changes} 条记录`);

    // 3. 删除旧表
    db.prepare('DROP TABLE novel_likes').run();
    console.log('✅ 删除旧表 novel_likes');

    // 4. 重命名新表
    db.prepare('ALTER TABLE novel_likes_v2 RENAME TO novel_likes').run();
    console.log('✅ 重命名 novel_likes_v2 → novel_likes');
  })();

  // 验证
  const verify = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='novel_likes'").get();
  const newCount = db.prepare('SELECT COUNT(*) as c FROM novel_likes').get();

  console.log('📋 新 DDL:', verify.sql);
  console.log(`📊 迁移后 ${newCount.c} 条记录`);
  console.log('✅ 迁移完成！UNIQUE 约束已移除，可重复点赞');
} catch (err) {
  console.error('❌ 迁移失败:', err.message);
  process.exit(1);
} finally {
  db.close();
}
