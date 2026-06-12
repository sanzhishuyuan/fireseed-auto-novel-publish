/**
 * 世界书导入脚本
 * 将 AI跑团 文件夹下的 6 部世界书导入数据库并上架市场
 *
 * 定价策略：
 *   凡人修仙 → FREE (公共共享，新手友好)
 *   都市异能 → 100 🌱
 *   诡秘克苏鲁 → 200 🌱 (最详细，60KB)
 *   末世求生 → 120 🌱
 *   无限流 → 100 🌱
 *   星际机甲 → 150 🌱
 *
 * 用法：node scripts/import-worldbooks.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== 配置 =====
const WORLDBOOKS_DIR = join(__dirname, 'worldbooks');
const DB_PATH = join(__dirname, '..', 'data', 'novel.db');

// 管理员用户（雾隐工坊 — 平台官方内容发布账户）
const ADMIN_USERNAME = '雾隐工坊';

// 定价策略
const PRICING = {
  '凡人修仙': { price: 0, license: 'public_free', desc: '免费共享' },
  '都市异能': { price: 100, license: 'full_copy', desc: '100 🌱' },
  '诡秘克苏鲁': { price: 200, license: 'full_copy', desc: '200 🌱' },
  '末世求生': { price: 120, license: 'full_copy', desc: '120 🌱' },
  '无限流': { price: 100, license: 'full_copy', desc: '100 🌱' },
  '星际机甲': { price: 150, license: 'full_copy', desc: '150 🌱' },
};

// ===== 数据库初始化 =====
let db;
try {
  const BetterSqlite3 = (await import('better-sqlite3')).default;
  if (!existsSync(DB_PATH)) {
    console.error(`❌ 数据库文件不存在: ${DB_PATH}`);
    process.exit(1);
  }
  db = new BetterSqlite3(DB_PATH);
  db.pragma('journal_mode = WAL');
  console.log('✅ 数据库连接成功');
} catch (e) {
  console.error('❌ 加载 better-sqlite3 失败，请确保已安装:', e.message);
  process.exit(1);
}

// ===== 辅助函数 =====

/** 从文件名推断世界书名称 */
function inferBookName(filename) {
  const name = filename
    .replace(/^世界书_/, '')
    .replace(/_v[\d.]+\.md$/, '')
    .replace(/\.md$/, '');
  
  const mapping = {
    '凡人修仙': '尘星界 · 凡人修仙',
    '都市异能': '暗面 · 都市异能',
    '诡秘克苏鲁': '雾都纪元 · 诡秘克苏鲁',
    '末世求生': '灰烬纪元 · 末世求生',
    '无限流': '轮回域 · 无限流',
    '星际机甲': '星渊纪 · 星际机甲',
  };
  return mapping[name] || name;
}

/** 从文件名推断简称（用于定价查找） */
function inferShortName(filename) {
  const name = filename
    .replace(/^世界书_/, '')
    .replace(/_?v[\d.]+\.md$/, '')
    .replace(/\.md$/, '');
  return name;
}

/** 提取 markdown 中的标题（第一个 # 行） */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : inferBookName('');
}

/** 提取描述（标题后的第一段文字） */
function extractDescription(content, title) {
  // 去掉 front matter（--- 之间的内容）
  let clean = content.replace(/^---[\s\S]*?---\n*/, '');
  
  // 找到第一个 # 标题后的内容
  const afterTitle = clean.replace(/^#\s+.+$/m, '').trim();
  
  // 提取第一段有意义的文字
  const paragraphs = afterTitle.split(/\n\n+/).filter(p => {
    const t = p.trim();
    return t.length > 10 && !t.startsWith('>') && !t.startsWith('---');
  });
  
  if (paragraphs.length > 0) {
    return paragraphs[0].replace(/^>\s*/gm, '').trim().slice(0, 300);
  }
  return `《${title}》—— 一部精心构建的跑团世界书`;
}

/** 将 markdown 解析为 LorebookEntry 数组 */
function parseEntries(content) {
  // 去掉 front matter
  let clean = content.replace(/^---[\s\S]*?---\n*/, '');
  
  const entries = [];
  const lines = clean.split('\n');
  let currentSection = null;
  let currentContent = [];
  let sectionCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);
    
    if (h2Match) {
      // Save previous section
      if (currentSection) {
        const entry = makeEntry(currentSection, currentContent.join('\n').trim(), sectionCounter);
        if (entry) entries.push(entry);
      }
      currentSection = { type: 'h2', title: h2Match[1].trim() };
      currentContent = [];
      sectionCounter++;
    } else if (h3Match) {
      // Save previous subsection
      if (currentSection && currentContent.length > 0 && currentSection.type === 'h3') {
        const entry = makeEntry(currentSection, currentContent.join('\n').trim(), sectionCounter);
        if (entry) entries.push(entry);
        sectionCounter++;
      }
      currentSection = { type: 'h3', title: h3Match[1].trim() };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  
  // Last section
  if (currentSection) {
    const entry = makeEntry(currentSection, currentContent.join('\n').trim(), sectionCounter);
    if (entry) entries.push(entry);
  }

  return entries;
}

/** 从章节创建 LorebookEntry */
function makeEntry(section, content, priority) {
  if (!content || content.length < 5) return null;

  const title = section.title;
  const keys = extractKeys(title, content);
  const id = randomUUID();
  
  // Discard sections that are too short or just navigation
  if (content.length < 10) return null;

  return {
    id,
    keys,
    content: `## ${title}\n\n${content}`,
    enabled: true,
    selective: false,
    priority: Math.max(0, 100 - priority),
    secondary_keys: [],
    constant: false,
  };
}

/** 从标题和内容提取关键词 */
function extractKeys(title, content) {
  // Clean title: remove numbering, special chars
  const cleanTitle = title
    .replace(/^[\d.、\s]+/, '')
    .replace(/^表\d*/, '')
    .replace(/^附录[A-Z]*[:：]?\s*/, '')
    .trim();

  const keys = new Set();
  
  // Add title keywords
  const titleWords = cleanTitle.split(/[\s·,，、/\\()（）]+/).filter(w => w.length >= 2);
  titleWords.forEach(w => keys.add(w));

  // Add content keywords from first line
  const firstLine = content.split('\n')[0]?.replace(/^[#>\s]+/, '') || '';
  const contentWords = firstLine.split(/[\s,，、]+/).filter(w => w.length >= 2 && w.length <= 10);
  contentWords.slice(0, 3).forEach(w => keys.add(w));

  return Array.from(keys).slice(0, 8);
}

// ===== 主流程 =====

async function main() {
  console.log('\n========== 世界书导入工具 ==========\n');
  
  // 1. 查找或创建管理员用户
  let adminUser = db.prepare('SELECT id, username FROM users WHERE username = ?').get(ADMIN_USERNAME);
  if (!adminUser) {
    const adminId = randomUUID();
    db.prepare(`INSERT INTO users (id, username, nickname, password, role, creator_level, creator_score) 
      VALUES (?, ?, ?, 'platform_admin_seed', 'admin', 5, 99999)`).run(adminId, ADMIN_USERNAME, '雾隐工坊');
    adminUser = { id: adminId, username: ADMIN_USERNAME };
    console.log(`  👤 已创建管理员: ${ADMIN_USERNAME}`);
  }
  console.log(`👤 管理员: ${adminUser.username} (${adminUser.id})`);

  // 2. 读取所有世界书文件
  const files = readdirSync(WORLDBOOKS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  console.log(`📚 发现 ${files.length} 部世界书:\n`);

  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const shortName = inferShortName(file);
    const bookName = inferBookName(file);
    const pricing = PRICING[shortName];
    
    if (!pricing) {
      console.warn(`  ⚠️  跳过 "${file}": 未配置定价策略`);
      skipped++;
      continue;
    }

    console.log(`  ┌─ ${bookName}`);
    console.log(`  │  文件: ${file}`);
    console.log(`  │  定价: ${pricing.desc}`);

    // 检查是否已导入（同名去重）
    const existing = db.prepare('SELECT id FROM rpg_lorebooks WHERE name = ?').get(bookName);
    if (existing) {
      console.log(`  │  ⚠️  已存在 (id: ${existing.id})，跳过`);
      console.log(`  └─`);
      skipped++;
      continue;
    }

    // 读取文件
    const content = readFileSync(join(WORLDBOOKS_DIR, file), 'utf-8');
    const title = extractTitle(content);
    const description = extractDescription(content, title);
    const entries = parseEntries(content);

    console.log(`  │  章节数: ${entries.length}`);
    console.log(`  │  描述: ${description.slice(0, 60)}...`);

    // 创建世界书
    const lorebookId = randomUUID();
    
    db.prepare(`
      INSERT INTO rpg_lorebooks (id, name, description, user_id, entries, is_public, 
        seed_price, license_type, download_count, copy_count, avg_rating, rating_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)
    `).run(
      lorebookId,
      bookName,
      description,
      adminUser.id,
      JSON.stringify(entries),
      pricing.license === 'public_free' ? 1 : 0,
      pricing.price,
      pricing.license
    );

    // 如果是付费的，上架到市场
    if (pricing.price > 0) {
      const listingId = randomUUID();
      
      db.prepare(`
        INSERT INTO rpg_market_listings (id, asset_type, asset_id, seller_id, price, 
          license_mode, status, platform_fee, creator_share)
        VALUES (?, 'lorebook', ?, ?, ?, 'full_copy', 'active', ?, ?)
      `).run(
        listingId,
        lorebookId,
        adminUser.id,
        pricing.price,
        Math.floor(pricing.price * 0.1),  // 平台费 10%
        Math.floor(pricing.price * 0.85)  // 创作者收入 85%
      );

      console.log(`  │  🏪 已上架市场 (${listingId.slice(0, 8)}...)`);
    } else {
      console.log(`  │  🆓 免费共享`);
    }

    imported++;
    console.log(`  └─ ✅ 导入成功\n`);
  }

  console.log(`\n========== 导入完成 ==========`);
  console.log(`  ✅ 成功: ${imported}`);
  console.log(`  ⏭️  跳过: ${skipped}`);
  console.log(`  📊 世界书总数: ${db.prepare('SELECT COUNT(*) as c FROM rpg_lorebooks').get().c}`);
  console.log(`  🏪 市场挂牌数: ${db.prepare("SELECT COUNT(*) as c FROM rpg_market_listings WHERE status = 'active'").get().c}\n`);

  db.close();
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});
