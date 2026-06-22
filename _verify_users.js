const Database = require('/root/ai-novel-lite/node_modules/better-sqlite3');
const path = require('path');
const db = new Database(path.join('/root/ai-novel-lite/data/novel.db'));

const USERS = [
  { userId: 'ce096dc5-01e5-44b7-b2c6-2edad27f4d47', username: '沉默的人' },
  { userId: '5ccbdbce-e133-4529-af9f-68843f18aa21', username: 'sbtv587' },
  { userId: '035e938a-237b-43a1-b841-43f486ba491e', username: 'buran' },
  { userId: 'f85142d3-a2e2-4e30-8414-5ec485388ba8', username: 'jackey3ice@gmail.com' },
  { userId: 'ba42f74e-ecb6-4ba2-bf07-6b2e9199b876', username: 'mail_mq8ypots' },
  { userId: 'baa7fcee-392c-4ff4-b58d-870ca50e2d4d', username: 'aiecc608' },
];

console.log('=== 验证用户ID是否存在 ===');
for (const u of USERS) {
  const row = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(u.userId);
  if (row) {
    console.log(`✅ ${u.username.padEnd(25)} ${u.userId} -> 存在 (${row.username}, ${row.email || '无邮箱'})`);
  } else {
    // 尝试模糊搜索
    const fuzzy = db.prepare("SELECT id, username FROM users WHERE username LIKE ? OR email LIKE ?").get(`%${u.username.split('@')[0]}%`, `%${u.username.split('@')[0]}%`);
    if (fuzzy) {
      console.log(`❌ ${u.username.padEnd(25)} ${u.userId} -> 不存在，但找到相似用户: ${fuzzy.username} (${fuzzy.id})`);
    } else {
      console.log(`❌ ${u.username.padEnd(25)} ${u.userId} -> 不存在，也未找到相似用户`);
    }
  }
}

// 列出所有用户ID和用户名
console.log('\n=== 数据库中所有用户 ===');
const all = db.prepare('SELECT id, username, email FROM users ORDER BY created_at DESC').all();
all.forEach(u => console.log(`  ${u.id.substring(0,12)}... | ${(u.username || '?').padEnd(25)} | ${u.email || '无邮箱'}`));

db.close();
