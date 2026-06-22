const Database = require('/root/ai-novel-lite/node_modules/better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('/root/ai-novel-lite/node_modules/uuid');
const db = new Database(path.join('/root/ai-novel-lite/data/novel.db'));

console.log('===== 开始回填 skill_activations 数据 =====\n');

// 1. 获取所有用户
const users = db.prepare('SELECT id, username, created_at FROM users ORDER BY created_at ASC').all();
console.log(`共 ${users.length} 个用户`);

let activationInserted = 0;
let eventInserted = 0;

// 2. 对每个用户，根据注册时间创建一条激活记录
const insertActivation = db.prepare(`
  INSERT INTO skill_activations (id, user_id, skill_version, client_type, ip_address, user_agent, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertEvent = db.prepare(`
  INSERT INTO skill_events (id, user_id, event_type, event_data, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

// 事务包装器
const insertActivationBulk = db.transaction(() => {
  for (const user of users) {
    // 注册激活
    insertActivation.run(
      uuidv4(), user.id, 'register-auto', 'web-register',
      '127.0.0.1', 'backfill-script', user.created_at
    );
    activationInserted++;

    // 注册事件
    insertEvent.run(
      uuidv4(), user.id, 'skill_activate',
      JSON.stringify({ source: 'backfill', action: 'user_registered' }),
      user.created_at
    );
    eventInserted++;
  }
});

insertActivationBulk();
console.log(`✅ 用户注册激活: ${activationInserted} 条`);

// 3. 获取所有小说作者，创建发书激活记录
const novels = db.prepare(`
  SELECT n.id as novel_id, n.title, n.author_id, n.created_at, u.username
  FROM novels n LEFT JOIN users u ON n.author_id = u.id
  WHERE n.deleted_at IS NULL ORDER BY n.created_at ASC
`).all();
console.log(`\n共 ${novels.length} 本有效小说`);

let novelActivations = 0;
let novelEvents = 0;

const insertNovelBulk = db.transaction(() => {
  for (const novel of novels) {
    if (!novel.author_id) continue;

    // 发书激活
    insertActivation.run(
      uuidv4(), novel.author_id, 'create-novel', 'api-auto',
      '127.0.0.1', 'backfill-script', novel.created_at
    );
    novelActivations++;

    // 发书事件
    insertEvent.run(
      uuidv4(), novel.author_id, 'novel_create',
      JSON.stringify({ novel_id: novel.novel_id, title: novel.title }),
      novel.created_at
    );
    novelEvents++;
  }
});

insertNovelBulk();
console.log(`✅ 发书激活: ${novelActivations} 条`);
console.log(`✅ 发书事件: ${novelEvents} 条`);

// 4. 检查 skill 的索引
console.log('\n===== 检查索引 =====');
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%skill%'").all();
indexes.forEach(idx => console.log('索引:', idx.name));

// 5. 最终统计
console.log('\n===== 回填后统计 =====');
const totalAct = db.prepare('SELECT COUNT(*) as c FROM skill_activations').get();
console.log('skill_activations 总行数:', totalAct.c);
const totalEvt = db.prepare('SELECT COUNT(*) as c FROM skill_events').get();
console.log('skill_events 总行数:', totalEvt.c);
const byVersion = db.prepare('SELECT skill_version, COUNT(*) as cnt FROM skill_activations GROUP BY skill_version').all();
console.log('版本分布:', JSON.stringify(byVersion));
const todayAct = db.prepare("SELECT COUNT(*) as c FROM skill_activations WHERE date(created_at) = date('now')").get();
console.log('今日激活:', todayAct.c);

db.close();
console.log('\n✅ 回填完成！');
