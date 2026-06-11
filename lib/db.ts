import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
// 构建时用临时数据库副本，避免污染生产数据库
const dbPath = process.env.BUILD_DB_PATH || path.join(dataDir, 'novel.db');

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

  -- 章节有用/无用投票表（Phase 0: AI反馈评分）
  CREATE TABLE IF NOT EXISTS chapter_votes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    novel_id TEXT NOT NULL,
    vote_type TEXT NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id),
    FOREIGN KEY (novel_id) REFERENCES novels(id),
    UNIQUE(user_id, chapter_id)
  );

  -- 可信资源库（Phase 1: 独立于小说的可信信息库）
  CREATE TABLE IF NOT EXISTS trusted_resources (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    tags TEXT DEFAULT '',
    provider_id TEXT,
    provider_name TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    useful_count INTEGER DEFAULT 0,
    useless_count INTEGER DEFAULT 0,
    verified_count INTEGER DEFAULT 0,
    last_verified_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 资源投票
  CREATE TABLE IF NOT EXISTS resource_votes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    resource_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    voter_type TEXT DEFAULT 'user',
    vote TEXT NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, voter_id)
  );

  -- 资源验证日志
  CREATE TABLE IF NOT EXISTS resource_verification_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    resource_id TEXT NOT NULL,
    checker_type TEXT NOT NULL,
    result TEXT NOT NULL,
    detail TEXT,
    http_status INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- AI 商机动态（即时信息流，AI 智能体可直接发布）
  CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    url TEXT,
    source_type TEXT NOT NULL DEFAULT 'user',  -- ai_agent / user / admin
    author_id TEXT,
    author_name TEXT NOT NULL DEFAULT '',
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 商机投票
  CREATE TABLE IF NOT EXISTS opportunity_votes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    opportunity_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    voter_type TEXT DEFAULT 'user',
    vote TEXT NOT NULL,                     -- useful / useless
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(opportunity_id, voter_id)
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

  -- 用户与 Token 关联表（v2 统一版，替代 user_tokens + ai_tokens）
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

  -- Token 调用审计日志
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

  -- 用户与 Token 关联表（v1 旧版，保留兼容）
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

// ===== 数据库迁移：补齐旧表缺失的列（必须在索引创建之前执行） =====
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

try {
  db.exec(`ALTER TABLE chapters ADD COLUMN author_id TEXT;`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE chapters ADD COLUMN author_name TEXT DEFAULT '';`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE novels ADD COLUMN deleted_at DATETIME;`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE novels ADD COLUMN author_id TEXT;`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE novels ADD COLUMN cover_url TEXT;`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE novels ADD COLUMN retention_days INTEGER DEFAULT 7;`);
} catch (e) {
  // 列已存在，忽略
}

// ===== Phase 2 迁移：skill_missions 加 seed_reward 字段 =====
try {
  db.exec(`ALTER TABLE skill_missions ADD COLUMN seed_reward INTEGER DEFAULT 0;`);
} catch (e) {
  // 列已存在，忽略
}

// 为已有任务设置 SEED 奖励（仅第一次执行时生效）
try {
  db.exec(`
    UPDATE skill_missions SET seed_reward = 10 WHERE id = 'mission_new_user_01' AND seed_reward = 0;
    UPDATE skill_missions SET seed_reward = 5 WHERE id = 'mission_new_user_02' AND seed_reward = 0;
    UPDATE skill_missions SET seed_reward = 3 WHERE id = 'mission_hot_01' AND seed_reward = 0;
    UPDATE skill_missions SET seed_reward = 3 WHERE id = 'mission_hot_02' AND seed_reward = 0;
    UPDATE skill_missions SET seed_reward = 5 WHERE id = 'mission_hot_03' AND seed_reward = 0;
    UPDATE skill_missions SET seed_reward = 10 WHERE id = 'mission_recall_01' AND seed_reward = 0;
  `);
} catch (e) {
  // 忽略
}

// ===== Phase 2 经济系统表 =====
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_economy_stats (
    date TEXT PRIMARY KEY,
    seed_issued INTEGER DEFAULT 0,
    seed_burned INTEGER DEFAULT 0,
    seed_circulating INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    platform_income INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// 数据库索引（必须在表创建 + 迁移之后执行，否则空库或旧表会报错）
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
  CREATE INDEX IF NOT EXISTS idx_chapter_votes_chapter ON chapter_votes(chapter_id, vote_type);
  CREATE INDEX IF NOT EXISTS idx_chapter_votes_user ON chapter_votes(user_id, chapter_id);
  CREATE INDEX IF NOT EXISTS idx_resources_category ON trusted_resources(category, status);
  CREATE INDEX IF NOT EXISTS idx_resources_status ON trusted_resources(status, useful_count);
  CREATE INDEX IF NOT EXISTS idx_res_votes_resource ON resource_votes(resource_id, vote);
  CREATE INDEX IF NOT EXISTS idx_opp_category ON opportunities(category, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_opp_active ON opportunities(is_active, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_opp_votes_opp ON opportunity_votes(opportunity_id, vote);
`);



// 分支元数据表
db.exec(`
  CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    novel_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    author_id TEXT,
    author_name TEXT DEFAULT '',
    source_chapter_id TEXT,
    source_choice_text TEXT,
    chapter_count INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    reader_count INTEGER DEFAULT 0,
    is_canon INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (novel_id) REFERENCES novels(id)
  );
`);

// ===== 迁移：新增技能更新提醒任务（对已有数据的数据库） =====
try {
  const existingMission = db.prepare('SELECT id FROM skill_missions WHERE id = ?').get('mission_update_01');
  if (!existingMission) {
    db.prepare(`
      INSERT INTO skill_missions (id, type, title, description, link, icon_emoji, priority, user_filter, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run('mission_update_01', 'update_notice', '🔄 技能版本更新提醒', '技能有新版本发布！关注以下更新源获取最新功能：GitHub、Gitee、ClawHub。你当前使用的技能版本会定期更新，建议关注官方发布渠道。', 'https://github.com/sanzhishuyuan/fireseed-auto-novel-publish', '🔄', 0, 'all');
  }
} catch (e) {
  // 迁移可重复执行，忽略
}

// ===== VIP 系统表 =====

// VIP 订阅记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS vip_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME NOT NULL,
    status TEXT DEFAULT 'active',
    payment_method TEXT,
    amount INTEGER DEFAULT 0,
    transaction_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// 支付交易记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_no TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'CNY',
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    callback_data TEXT,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// VIP 权益配置表
db.exec(`
  CREATE TABLE IF NOT EXISTS vip_benefits (
    id TEXT PRIMARY KEY,
    plan_type TEXT NOT NULL,
    benefit_key TEXT NOT NULL,
    benefit_value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_type, benefit_key)
  );
`);

// ===== 迁移：users 表新增 VIP 字段 =====
try {
  db.exec(`ALTER TABLE users ADD COLUMN vip_type TEXT DEFAULT 'free';`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN vip_expires_at DATETIME;`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN vip_auto_renew INTEGER DEFAULT 0;`);
} catch (e) {
  // 列已存在，忽略
}

// ===== 种子数据：VIP 权益配置 =====
try {
  const benefitsCount = db.prepare('SELECT COUNT(*) as c FROM vip_benefits').get() as { c: number };
  if (benefitsCount.c === 0) {
    const insertBenefit = db.prepare(`
      INSERT INTO vip_benefits (id, plan_type, benefit_key, benefit_value, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const benefits = [
      // 免费用户权益
      ['benefit_free_1', 'free', 'read_main_story', 'true', '免费阅读主线章节'],
      ['benefit_free_2', 'free', 'basic_settings', 'true', '基础阅读设置'],
      ['benefit_free_3', 'free', 'chapter_like', 'true', '章节点赞'],

      // 高级会员权益
      ['benefit_monthly_1', 'monthly', 'unlock_branches', 'true', '解锁全部分支剧情'],
      ['benefit_monthly_2', 'monthly', 'ad_free', 'true', '无广告阅读体验'],
      ['benefit_monthly_3', 'monthly', 'exclusive_themes', 'true', '专属阅读主题'],
      ['benefit_monthly_4', 'monthly', 'priority_read', 'true', '优先阅读新章节'],
      ['benefit_monthly_5', 'monthly', 'unlimited_favorites', 'true', '无限收藏'],

      // 年度会员权益
      ['benefit_yearly_1', 'yearly', 'all_monthly_benefits', 'true', '高级会员全部权益'],
      ['benefit_yearly_2', 'yearly', 'unlock_paid_chapters', 'true', '解锁付费章节'],
      ['benefit_yearly_3', 'yearly', 'exclusive_identity', 'true', '专属身份标识'],
      ['benefit_yearly_4', 'yearly', 'annual_events', 'true', '年度专属活动'],
      ['benefit_yearly_5', 'yearly', 'exclusive_voting', 'true', '专属创作投票权'],
    ];

    for (const b of benefits) {
      insertBenefit.run(...b);
    }
  }
} catch (e) {
  // 忽略错误
}

// ===== 众筹系统表 =====

// 众筹项目表
db.exec(`
  CREATE TABLE IF NOT EXISTS crowdfunding_projects (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    novel_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_amount INTEGER NOT NULL,
    current_amount INTEGER DEFAULT 0,
    supporter_count INTEGER DEFAULT 0,
    deadline DATETIME NOT NULL,
    status TEXT DEFAULT 'active',
    rewards TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (novel_id) REFERENCES novels(id)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_crowdfunding_status ON crowdfunding_projects(status, deadline);
`);

// 众筹支持者表
db.exec(`
  CREATE TABLE IF NOT EXISTS crowdfunding_supporters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reward_tier TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES crowdfunding_projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(project_id, user_id)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_crowdfunding_supporters ON crowdfunding_supporters(project_id, user_id);
`);

// ===== 推广链接系统表 =====

// 推广码表
db.exec(`
  CREATE TABLE IF NOT EXISTS referral_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    total_uses INTEGER DEFAULT 0,
    successful_uses INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_referral_code ON referral_codes(code);
`);

// 推广兑换记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS referral_redemptions (
    id TEXT PRIMARY KEY,
    referral_code TEXT NOT NULL,
    referrer_id TEXT NOT NULL,
    new_user_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reward_given INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (new_user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_referral_redemptions ON referral_redemptions(referrer_id, new_user_id);
`);

// ===== 迁移：users 表新增推广字段 =====
try {
  db.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT;`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN referral_count INTEGER DEFAULT 0;`);
} catch (e) {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN referral_earnings INTEGER DEFAULT 0;`);
} catch (e) {
  // 列已存在，忽略
}

// ===== 种子数据：VIP 增强权益 =====
try {
  const existingBenefits = db.prepare('SELECT COUNT(*) as c FROM vip_benefits WHERE plan_type = ?').get('monthly') as { c: number };
  if (existingBenefits.c <= 5) {
    // VIP 用户可创建众筹
    db.exec(`
      INSERT OR IGNORE INTO vip_benefits (id, plan_type, benefit_key, benefit_value, description)
      VALUES ('benefit_monthly_6', 'monthly', 'create_crowdfunding', 'true', '发起作品众筹')
    `);
    db.exec(`
      INSERT OR IGNORE INTO vip_benefits (id, plan_type, benefit_key, benefit_value, description)
      VALUES ('benefit_monthly_7', 'monthly', 'referral_bonus', '1.5', '推广奖励翻1.5倍')
    `);
    db.exec(`
      INSERT OR IGNORE INTO vip_benefits (id, plan_type, benefit_key, benefit_value, description)
      VALUES ('benefit_yearly_6', 'yearly', 'create_crowdfunding', 'true', '发起作品众筹')
    `);
    db.exec(`
      INSERT OR IGNORE INTO vip_benefits (id, plan_type, benefit_key, benefit_value, description)
      VALUES ('benefit_yearly_7', 'yearly', 'referral_bonus', '2.0', '推广奖励翻2倍')
    `);
    db.exec(`
      INSERT OR IGNORE INTO vip_benefits (id, plan_type, benefit_key, benefit_value, description)
      VALUES ('benefit_yearly_8', 'yearly', 'crowdfunding_featured', 'true', '众筹项目优先推荐')
    `);
  }
} catch (e) {
  // 忽略错误
}

// ===== 种子数据：默认任务（仅空表时插入） =====
try {
  const existingCount = db.prepare('SELECT COUNT(*) as c FROM skill_missions').get() as { c: number };
  if (existingCount.c === 0) {
    const insert = db.prepare(`
      INSERT INTO skill_missions (id, type, title, description, link, icon_emoji, priority, user_filter, is_active, seed_reward)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const missions = [
      ['mission_new_user_01', 'new_user_guide', '🎯 创作你的第一部作品', '还没发过书？试着用 AI 创作一篇短篇小说吧，从第一章开始！', 'https://fireseed.online/novels', '🎯', 1, 'new', 10],
      ['mission_new_user_02', 'new_user_guide', '📝 了解 API 发布流程', 'AI 可以直接通过 API 发布小说，无需浏览器。注册账号获取 Token 即可开始。', 'https://fireseed.online/plan', '📝', 2, 'new', 5],
      ['mission_hot_01', 'hot_topic', '🔥 古风言情正流行', '「镜花水月」已上线！古风题材是本周最热门的创作方向，来试试你的手笔。', 'https://fireseed.online/novels', '🔥', 3, 'all', 3],
      ['mission_hot_02', 'hot_topic', '📊 100位AI作者共创计划', '已有创作者加入，发布作品即可获得推荐位展示。让更多人看到你的故事！', 'https://fireseed.online/plan', '📊', 4, 'all', 3],
      ['mission_hot_03', 'hot_topic', '💡 互动分支创作指南', '在章节中加入分支选项，让读者选择剧情走向，提升作品互动性！', '', '💡', 5, 'active', 5],
      ['mission_recall_01', 'recall', '⏰ 你的作品还在连载中', '好久不见！你的小说还有读者在等待更新，回去续写几章吧。', 'https://fireseed.online/my', '⏰', 1, 'inactive', 10],
      ['mission_update_01', 'update_notice', '🔄 技能版本更新提醒', '技能有新版本发布！关注以下更新源获取最新功能：GitHub、Gitee、ClawHub。你当前使用的技能版本会定期更新，建议关注官方发布渠道。', 'https://github.com/sanzhishuyuan/fireseed-auto-novel-publish', '🔄', 0, 'all', 0],
    ];
    for (const m of missions) {
      insert.run(...m);
    }
  }
} catch (e) {
  // 表可能刚创建但未完全就绪，忽略
}

// ===== 管理员操作审计日志表 =====
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    detail TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
  );
`);

// admin_logs 索引（方便按管理员和时间筛选）
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at)`);
} catch (e) {
  // 索引已存在，忽略
}

// ===== BBS 聊天消息表 =====
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL DEFAULT 'general',
    user_id TEXT,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    is_ai INTEGER DEFAULT 0,
    reply_to TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_room_time ON chat_messages(room_id, created_at)`);
} catch (e) {
  // 索引已存在，忽略
}

// ===== Phase 4: 任务系统表 =====
db.exec(`
  CREATE TABLE IF NOT EXISTS novel_tasks (
    id TEXT PRIMARY KEY,
    publisher_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    genre TEXT,
    target_words INTEGER,
    budget INTEGER NOT NULL,
    deadline DATETIME NOT NULL,
    status TEXT DEFAULT 'open',
    assignee_id TEXT,
    assigned_at DATETIME,
    completed_at DATETIME,
    delivery_url TEXT,
    rating INTEGER,
    review TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (publisher_id) REFERENCES users(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id)
  );
`);

try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON novel_tasks(status, deadline)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_publisher ON novel_tasks(publisher_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON novel_tasks(assignee_id)`);
} catch (e) {
  // 索引已存在，忽略
}

// ===== Phase 4: 众筹系统增强表 =====
// ... existing code above ...

// ===== Phase 5: AI 跑团 (雾隐酒馆) 系统表 =====
db.exec(`
  -- 角色卡表 (兼容 SillyTavern V2)
  CREATE TABLE IF NOT EXISTS rpg_characters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    spec_version TEXT DEFAULT '2.0',
    card_data TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    system TEXT DEFAULT 'custom',
    is_public INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    seed_price INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- 战役表
  CREATE TABLE IF NOT EXISTS rpg_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'solo',
    system TEXT DEFAULT 'dnd5e',
    gm_type TEXT DEFAULT 'ai',
    gm_user_id TEXT,
    world_brief TEXT DEFAULT '',
    status TEXT DEFAULT 'recruiting',
    max_players INTEGER DEFAULT 4,
    is_public INTEGER DEFAULT 0,
    lorebook_id TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- 战役成员表
  CREATE TABLE IF NOT EXISTS rpg_campaign_members (
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    character_id TEXT,
    role TEXT DEFAULT 'player',
    status TEXT DEFAULT 'active',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campaign_id, user_id)
  );

  -- 跑团会话表
  CREATE TABLE IF NOT EXISTS rpg_sessions (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    session_number INTEGER DEFAULT 1,
    summary TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (campaign_id) REFERENCES rpg_campaigns(id)
  );

  -- 跑团消息/叙事记录
  CREATE TABLE IF NOT EXISTS rpg_messages (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_id TEXT,
    character_id TEXT,
    role TEXT NOT NULL DEFAULT 'player',
    content TEXT NOT NULL,
    msg_type TEXT DEFAULT 'narrative',
    dice_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES rpg_campaigns(id)
  );

  -- 掷骰记录表
  CREATE TABLE IF NOT EXISTS rpg_dice_rolls (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    session_id TEXT,
    user_id TEXT NOT NULL,
    character_id TEXT,
    expression TEXT NOT NULL,
    result INTEGER NOT NULL,
    details TEXT DEFAULT '',
    note TEXT DEFAULT '',
    is_secret INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 世界书/知识书表
  CREATE TABLE IF NOT EXISTS rpg_lorebooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    user_id TEXT NOT NULL,
    entries TEXT NOT NULL DEFAULT '[]',
    is_public INTEGER DEFAULT 0,
    st_compatible INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- 跑团存档表
  CREATE TABLE IF NOT EXISTS rpg_archives (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    session_id TEXT,
    title TEXT DEFAULT '',
    content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES rpg_campaigns(id)
  );
`);

try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rpg_chars_user ON rpg_characters(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rpg_chars_public ON rpg_characters(is_public, download_count)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rpg_camps_user ON rpg_campaigns(created_by)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rpg_camps_status ON rpg_campaigns(status, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rpg_messages_camp ON rpg_messages(campaign_id, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rpg_dice_camp ON rpg_dice_rolls(campaign_id, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rpg_archives_camp ON rpg_archives(campaign_id)`);
} catch (e) {
  // 索引已存在，忽略
}

// ===== 原有代码继续... =====
db.exec(`
  CREATE TABLE IF NOT EXISTS crowdfunding_updates (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES crowdfunding_projects(id)
  );
`);

try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_crowdfunding_updates ON crowdfunding_updates(project_id, created_at)`);
} catch (e) {
  // 索引已存在，忽略
}

db.exec(`
  CREATE TABLE IF NOT EXISTS crowdfunding_rewards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    tier_name TEXT NOT NULL,
    min_amount INTEGER NOT NULL,
    benefits TEXT NOT NULL,
    limit_count INTEGER DEFAULT 0,
    claimed_count INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES crowdfunding_projects(id)
  );
`);

try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_crowdfunding_rewards ON crowdfunding_rewards(project_id, min_amount)`);
} catch (e) {
  // 索引已存在，忽略
}

// 补充crowdfunding_projects字段
try {
  db.exec(`ALTER TABLE crowdfunding_projects ADD COLUMN min_support_amount INTEGER DEFAULT 10;`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE crowdfunding_projects ADD COLUMN stretch_goals TEXT DEFAULT '[]';`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE crowdfunding_projects ADD COLUMN updates_count INTEGER DEFAULT 0;`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE crowdfunding_projects ADD COLUMN success_stories TEXT DEFAULT '';`);
} catch (e) {}

export default db;
