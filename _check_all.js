const Database = require('/root/ai-novel-lite/node_modules/better-sqlite3');
const path = require('path');
const db = new Database(path.join('/root/ai-novel-lite/data/novel.db'));

console.log('=== 用户统计 ===');
const users = db.prepare('SELECT COUNT(*) as c, date(MIN(created_at)) as earliest, date(MAX(created_at)) as latest FROM users').get();
console.log('用户总数:', users.c, '最早:', users.earliest, '最晚:', users.latest);

console.log('\n=== 近30天注册用户 ===');
const recent = db.prepare("SELECT id, username, created_at FROM users WHERE created_at >= datetime('now', '-30 days') ORDER BY created_at DESC").all();
console.log('近30天注册:', recent.length);
recent.forEach(u => console.log(' -', u.username, '|', u.created_at));

console.log('\n=== skill_activations ===');
const act = db.prepare('SELECT COUNT(*) as c FROM skill_activations').get();
console.log('激活记录总数:', act.c);

console.log('\n=== skill_events ===');
const evt = db.prepare('SELECT COUNT(*) as c FROM skill_events').get();
console.log('事件记录总数:', evt.c);

console.log('\n=== novels 统计 ===');
const novels = db.prepare('SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL').get();
console.log('有效小说数:', novels.c);

console.log('\n=== 表创建时间/sqlite_master ===');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name LIKE '%skill%'").all();
tables.forEach(t => {
  console.log('---', t.name, '---');
  console.log(t.sql);
});

db.close();
