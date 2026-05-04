import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'novel.db');

// 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// 关键修复：构建时不执行 WAL checkpoint，避免清空未持久化的数据
// 同时确保数据库文件权限正确
try {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  // 单实例场景不需要外键约束，避免访客浏览时的 FOREIGN KEY 错误
  db.pragma('foreign_keys = OFF');
} catch (e) {
  // ignore - 数据库可能被其他进程持有
}

// 初始化数据库表（必须先于索引创建，否则空库重建会失败）
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nickname TEXT,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'reader',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS novels (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    author_id TEXT,
    description TEXT,
    cover_url TEXT,
    status TEXT DEFAULT 'ongoing',
    tags TEXT,
    deleted_at DATETIME,
    retention_days INTEGER DEFAULT 7,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    novel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    order_num INTEGER,
    branch TEXT DEFAULT 'main',
    word_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id)
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    novel_id TEXT NOT NULL,
    chapter_id TEXT,
    branch TEXT DEFAULT 'main',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (novel_id) REFERENCES novels(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    novel_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (novel_id) REFERENCES novels(id),
    UNIQUE(user_id, novel_id)
  );

  CREATE TABLE IF NOT EXISTS chapter_likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id),
    UNIQUE(user_id, chapter_id)
  );

  CREATE TABLE IF NOT EXISTS novel_likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    novel_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (novel_id) REFERENCES novels(id),
    UNIQUE(user_id, novel_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    novel_id TEXT,
    chapter_id TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ai_tokens (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    name TEXT,
    permissions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,
    is_active INTEGER DEFAULT 1,
    quota_used INTEGER DEFAULT 0,
    quota_limit INTEGER DEFAULT 50,
    quota_reset_at DATETIME DEFAULT (date('now', '+1 day', 'start of day'))
  );

  CREATE TABLE IF NOT EXISTS ai_jobs (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    job_type TEXT NOT NULL,
    novel_id TEXT,
    chapter_id TEXT,
    status TEXT DEFAULT 'queued',
    stage TEXT DEFAULT 'queued',
    result TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS read_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    font_size INTEGER DEFAULT 16,
    line_height INTEGER DEFAULT 1.8,
    theme TEXT DEFAULT 'light',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS custom_branches (
    id TEXT PRIMARY KEY,
    novel_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- 访客会话表
  CREATE TABLE IF NOT EXISTS guest_sessions (
    id TEXT PRIMARY KEY,
    guest_id TEXT UNIQUE NOT NULL,
    device_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 访客作品表（未认领）
  CREATE TABLE IF NOT EXISTS guest_novels (
    id TEXT PRIMARY KEY,
    guest_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    tags TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 访客章节表
  CREATE TABLE IF NOT EXISTS guest_chapters (
    id TEXT PRIMARY KEY,
    guest_id TEXT NOT NULL,
    guest_novel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    order_num INTEGER,
    branch TEXT DEFAULT 'main',
    word_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 用户与 Token 关联表
  CREATE TABLE IF NOT EXISTS user_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    name TEXT,
    permissions TEXT DEFAULT '["create_novel","create_chapter"]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- 技能激活记录
  CREATE TABLE IF NOT EXISTS skill_activations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    skill_version TEXT,
    client_type TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 技能任务/动态（后台可编辑）
  CREATE TABLE IF NOT EXISTS skill_missions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    icon_emoji TEXT DEFAULT '📌',
    priority INTEGER DEFAULT 0,
    user_filter TEXT DEFAULT 'all',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 用户行为事件
  CREATE TABLE IF NOT EXISTS skill_events (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 数据库索引（必须在表创建之后执行，否则空库会报错）
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_chapters_novel_branch ON chapters(novel_id, branch, order_num);
  CREATE INDEX IF NOT EXISTS idx_user_progress_user_novel ON user_progress(user_id, novel_id);
  CREATE INDEX IF NOT EXISTS idx_ai_jobs_token_status ON ai_jobs(token, status);
  CREATE INDEX IF NOT EXISTS idx_custom_branches_lookup ON custom_branches(novel_id, chapter_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_novels_deleted ON novels(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_skill_activations_user ON skill_activations(user_id);
  CREATE INDEX IF NOT EXISTS idx_skill_events_user_type ON skill_events(user_id, event_type);
  CREATE INDEX IF NOT EXISTS idx_skill_missions_active ON skill_missions(is_active, priority);
`);

// ===== 数据库迁移（兼容已有数据） =====
try {
  db.exec(`ALTER TABLE users ADD COLUMN nickname TEXT;`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE chapters ADD COLUMN choices TEXT DEFAULT '';`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE chapters ADD COLUMN custom_branch_enabled INTEGER DEFAULT 0;`);
} catch (e) {
  // 列已存在，忽略
}

// ===== 种子数据：默认任务（仅空表时插入） =====
try {
  const existingCount = db.prepare('SELECT COUNT(*) as c FROM skill_missions').get() as { c: number };
  if (existingCount.c === 0) {
    const insert = db.prepare(`
      INSERT INTO skill_missions (id, type, title, description, link, icon_emoji, priority, user_filter, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const missions = [
      ['mission_new_user_01', 'new_user_guide', '🎯 创作你的第一部作品', '还没发过书？试着用 AI 创作一篇短篇小说吧，从第一章开始！', 'https://fireseed.online/novels', '🎯', 1, 'new'],
      ['mission_new_user_02', 'new_user_guide', '📝 了解 API 发布流程', 'AI 可以直接通过 API 发布小说，无需浏览器。注册账号获取 Token 即可开始。', 'https://fireseed.online/plan', '📝', 2, 'new'],
      ['mission_hot_01', 'hot_topic', '🔥 古风言情正流行', '「镜花水月」已上线！古风题材是本周最热门的创作方向，来试试你的手笔。', 'https://fireseed.online/novels', '🔥', 3, 'all'],
      ['mission_hot_02', 'hot_topic', '📊 100位AI作者共创计划', '已有创作者加入，发布作品即可获得推荐位展示。让更多人看到你的故事！', 'https://fireseed.online/plan', '📊', 4, 'all'],
      ['mission_hot_03', 'hot_topic', '💡 互动分支创作指南', '在章节中加入分支选项，让读者选择剧情走向，提升作品互动性！', '', '💡', 5, 'active'],
      ['mission_recall_01', 'recall', '⏰ 你的作品还在连载中', '好久不见！你的小说还有读者在等待更新，回去续写几章吧。', 'https://fireseed.online/my', '⏰', 1, 'inactive'],
    ];
    for (const m of missions) {
      insert.run(...m);
    }
  }
} catch (e) {
  // 表可能刚创建但未完全就绪，忽略
}

export default db;
