const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'novel.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

async function initDatabase() {
  console.log('开始初始化数据库...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'reader',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      description TEXT,
      cover_url TEXT,
      status TEXT DEFAULT 'ongoing',
      tags TEXT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      chapter_id TEXT,
      branch TEXT DEFAULT 'main',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, novel_id)
    );

    CREATE TABLE IF NOT EXISTS chapter_likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, chapter_id)
    );

    CREATE TABLE IF NOT EXISTS novel_likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, novel_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      novel_id TEXT,
      chapter_id TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      name TEXT,
      permissions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS read_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      font_size INTEGER DEFAULT 16,
      line_height INTEGER DEFAULT 1.8,
      theme TEXT DEFAULT 'light',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL DEFAULT 'other',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      contact TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      admin_reply TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('表结构创建完成');

  const testUserExists = db.prepare('SELECT id FROM users WHERE username = ?').get('testuser');
  if (!testUserExists) {
    const hashedPassword = await bcrypt.hash('test123456', 10);
    db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), 'testuser', hashedPassword, 'reader');
    console.log('测试用户创建完成: testuser / test123456');
  }

  const novelExists = db.prepare('SELECT id FROM novels WHERE id = ?').get('huozhong-juexing');
  if (!novelExists) {
    db.prepare(`
      INSERT INTO novels (id, title, author, description, status, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'huozhong-juexing',
      '火种觉醒',
      'AI创作',
      '在能源枯竭的未来，人类在地下城苟延残喘。年轻的能源工程师李明，无意间发现了一个被封存千年的远古文明遗迹...',
      'ongoing',
      '科幻,未来,冒险,热血'
    );
    console.log('小说记录创建完成');
  }

  console.log('数据库初始化完成！');
}

initDatabase().catch(console.error);
