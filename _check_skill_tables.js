const Database = require('/root/ai-novel-lite/node_modules/better-sqlite3');
const path = require('path');
const db = new Database(path.join('/root/ai-novel-lite/data/novel.db'));

console.log('=== 技能相关表列表 ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%skill%' ORDER BY name").all();
tables.forEach(t => {
  const cnt = db.prepare('SELECT COUNT(*) as c FROM [' + t.name + ']').get();
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='" + t.name + "'").get();
  console.log('--- ' + t.name + ' (' + cnt.c + ' 行) ---');
  console.log(schema.sql.substring(0, 500));
  if (cnt.c > 0) {
    const sample = db.prepare('SELECT * FROM [' + t.name + '] LIMIT 3').all();
    console.log('样例数据:', JSON.stringify(sample, null, 2));
  }
});

db.close();
