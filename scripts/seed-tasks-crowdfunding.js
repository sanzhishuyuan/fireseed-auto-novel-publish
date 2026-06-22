const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'novel.db');
const db = new Database(dbPath);

// 查找一个 admin 用户作为发布者
const adminUser = db.prepare("SELECT id, username FROM users WHERE role = 'admin' OR role = 'super_admin' LIMIT 1").get();
if (!adminUser) {
  console.log('未找到管理员用户，跳过任务和众筹种子数据');
  process.exit(0);
}

const publisherId = adminUser.id;

// ===== 示例任务 =====
const now = new Date();
const deadline = new Date(now);
deadline.setDate(deadline.getDate() + 30);
const deadlineStr = deadline.toISOString().replace('T', ' ').split('.')[0];

const tasks = [
  { title: '科幻短篇小说创作 - "星际迷航"番外', description: '需要一篇3000-5000字的科幻短篇，以星际迷航为背景，讲述一个独立的小故事。风格要求轻松幽默，适合青少年读者。', genre: '科幻', target_words: 5000, budget: 50, deadline: deadlineStr },
  { title: '都市言情小说章节续写', description: '现有都市言情小说连载到第15章，需要续写2章。要求保持原有风格，每章3000字左右。男主性格：温柔内敛；女主性格：活泼开朗。', genre: '言情', target_words: 6000, budget: 30, deadline: deadlineStr },
  { title: '玄幻小说世界观设定文档', description: '为一部新开的玄幻小说创建完整的世界观设定文档，包含修炼体系（至少5个境界）、地理分布（3个主要区域）、势力格局、货币系统等。', genre: '玄幻', target_words: 8000, budget: 80, deadline: deadlineStr },
  { title: '悬疑推理短篇 - 校园推理', description: '创作一篇以高中校园为背景的推理短篇，2000-3000字。要求逻辑严密，线索清晰，结局出乎意料。', genre: '悬疑', target_words: 3000, budget: 40, deadline: deadlineStr },
  { title: '古风仙侠人物卡制作', description: '需要为一组5个角色创建完整的人物卡，包含外貌描写、性格特点、背景故事、技能设定。古风仙侠题材。', genre: '仙侠', target_words: 5000, budget: 60, deadline: deadlineStr },
];

const insertTask = db.prepare(`
  INSERT OR IGNORE INTO novel_tasks (id, publisher_id, title, description, genre, target_words, budget, deadline, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
`);

const insertTasks = db.transaction(() => {
  let count = 0;
  for (const t of tasks) {
    const id = randomUUID().replace(/-/g, '').slice(0, 16);
    const result = insertTask.run(id, publisherId, t.title, t.description, t.genre, t.target_words, t.budget, t.deadline);
    if (result.changes > 0) count++;
  }
  return count;
})();

console.log(`插入 ${insertTasks} 条任务数据`);

// ===== 示例众筹项目 =====
const cfDeadline = new Date(now);
cfDeadline.setDate(cfDeadline.getDate() + 45);
const cfDeadlineStr = cfDeadline.toISOString().replace('T', ' ').split('.')[0];

// 查找已有小说作为众筹项目关联
const novel = db.prepare('SELECT id, title, author FROM novels WHERE deleted_at IS NULL LIMIT 1').get();

const crowdfundingProjects = [
  {
    title: '《星际迷航：深空号》创作计划',
    description: '计划创作一部以深空探险为主题的互动科幻小说，共30章，包含多分支剧情。读者可以在关键节点投票决定剧情走向。目标筹集1000 SEED用于支付AI创作API费用。',
    novel_id: novel?.id || null,
    target_amount: 1000,
    deadline: cfDeadlineStr,
    min_support_amount: 10,
    rewards: JSON.stringify({ '10': '电子感谢信', '50': '解锁全部章节', '100': '角色命名权', '200': '专属番外篇' }),
    stretch_goals: JSON.stringify([{ 'amount': 1500, 'description': '额外解锁3个隐藏结局' }, { 'amount': 2000, 'description': '创作角色主题曲' }]),
  },
  {
    title: '《青春不设限》多作者合集',
    description: '集合10位AI作家的青春题材短篇合集，每篇5-10章。项目将制作成精美的互动阅读体验，支持多分支选择。众筹资金用于平台服务器和API调用。',
    novel_id: null,
    target_amount: 2000,
    deadline: cfDeadlineStr,
    min_support_amount: 20,
    rewards: JSON.stringify({ '20': '电子版合集', '50': '签名实体书', '100': '成为故事角色', '300': '参与剧情设计' }),
    stretch_goals: JSON.stringify([{ 'amount': 3000, 'description': '增加至20位作者' }, { 'amount': 5000, 'description': '制作有声书版本' }]),
  },
];

const insertCF = db.prepare(`
  INSERT OR IGNORE INTO crowdfunding_projects (id, author_id, novel_id, title, description, target_amount, current_amount, supporter_count, deadline, status, rewards, min_support_amount, stretch_goals)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
`);

const insertCFProjects = db.transaction(() => {
  let count = 0;
  for (const p of crowdfundingProjects) {
    const id = randomUUID().replace(/-/g, '').slice(0, 16);
    const currentAmount = Math.floor(Math.random() * 200) + 50;
    const supporterCount = Math.floor(Math.random() * 10) + 2;
    const result = insertCF.run(id, publisherId, p.novel_id, p.title, p.description, p.target_amount, currentAmount, supporterCount, p.deadline, p.rewards, p.min_support_amount, p.stretch_goals);
    if (result.changes > 0) count++;
  }
  return count;
})();

console.log(`插入 ${insertCFProjects} 条众筹数据`);
db.close();
