const Database = require('/root/ai-novel-lite/node_modules/better-sqlite3');
const path = require('path');
const db = new Database(path.join('/root/ai-novel-lite/data/novel.db'));

console.log('=== 激活监控统计数据 ===');
const total = db.prepare('SELECT COUNT(*) as c FROM skill_activations').get();
console.log('总激活次数:', total.c);

const today = db.prepare("SELECT COUNT(*) as c FROM skill_activations WHERE date(created_at) = date('now')").get();
console.log('今日激活:', today.c);

const thisWeek = db.prepare("SELECT COUNT(*) as c FROM skill_activations WHERE created_at >= datetime('now', '-7 days')").get();
console.log('本周激活:', thisWeek.c);

const byVersion = db.prepare('SELECT skill_version as version, COUNT(*) as count FROM skill_activations GROUP BY skill_version ORDER BY count DESC').all();
console.log('版本分布:', byVersion);

const recent = db.prepare(`
  SELECT sa.created_at, u.username, sa.skill_version, sa.client_type
  FROM skill_activations sa
  LEFT JOIN users u ON sa.user_id = u.id
  ORDER BY sa.created_at DESC LIMIT 5
`).all();
console.log('最近5条激活:', JSON.stringify(recent, null, 2));

const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get();
const authors = db.prepare("SELECT COUNT(DISTINCT author_id) as c FROM novels WHERE author_id IS NOT NULL AND deleted_at IS NULL").get();
console.log('\n转化数据:');
console.log('总用户:', totalUsers.c);
console.log('有作品的作者:', authors.c);

const activeUsers = db.prepare(`
  SELECT u.username, count(sa.id) as activation_count
  FROM users u
  JOIN skill_activations sa ON u.id = sa.user_id
  GROUP BY u.id
  ORDER BY activation_count DESC
  LIMIT 10
`).all();
console.log('\n最活跃用户 TOP10:', JSON.stringify(activeUsers, null, 2));

db.close();
