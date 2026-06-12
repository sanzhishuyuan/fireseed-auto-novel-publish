/**
 * 雾隐酒馆 — 冷启动种子数据脚本 (CommonJS)
 * 创建官方种子资产填充市场
 *
 * 用法: node scripts/seed-rpg-assets.cjs
 */
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库路径
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = process.env.BUILD_DB_PATH || path.join(dataDir, 'novel.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function id() { return uuidv4(); }

// ===== 1. 创建官方账户 =====
console.log('=== 创建官方账户 ===');

let officialUser = db.prepare("SELECT * FROM users WHERE username = 'official_seed'").get();
if (!officialUser) {
  const uid = id();
  db.prepare(`
    INSERT INTO users (id, username, nickname, password, role, creator_score, creator_level)
    VALUES (?, 'official_seed', '雾隐工坊', ?, 'admin', 10000, 5)
  `).run(uid, id());
  officialUser = db.prepare("SELECT * FROM users WHERE username = 'official_seed'").get();
  console.log('  创建官方账户:', officialUser.id);
} else {
  db.prepare('UPDATE users SET creator_score = 10000, creator_level = 5 WHERE id = ?').run(officialUser.id);
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(officialUser.id);
  if (!wallet) {
    db.prepare('INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES (?, 999999, 999999, 0)').run(officialUser.id);
  } else {
    db.prepare('UPDATE wallets SET balance = 999999 WHERE user_id = ?').run(officialUser.id);
  }
  console.log('  使用已有官方账户:', officialUser.id);
}

const OFFICIAL_ID = officialUser.id;

// ===== 2. 创建角色卡 =====
console.log('\n=== 创建角色卡 ===');

function createCharacter(name, system, description, personality, scenario, first_mes, trpg) {
  const existing = db.prepare('SELECT id FROM rpg_characters WHERE name = ? AND user_id = ?').get(name, OFFICIAL_ID);
  if (existing) {
    console.log('  跳过（已存在）: ' + name);
    return existing.id;
  }

  const cid = id();
  const cardData = {
    name, description, personality, scenario, first_mes,
    mes_example: '', system_prompt: '', post_history_instructions: '',
    tags: [], creator: '雾隐工坊', character_version: '1.0',
    trpg,
  };

  db.prepare(`
    INSERT INTO rpg_characters (id, user_id, name, spec_version, card_data, system, is_public, seed_price, license_type, avg_rating, rating_count, download_count, copy_count)
    VALUES (?, ?, ?, '2.0', ?, ?, 1, 0, 'public_free', 4.5, 12, 0, 0)
  `).run(cid, OFFICIAL_ID, name, JSON.stringify(cardData), system || 'custom');

  console.log('  [OK] ' + name + ' (' + (system || 'custom') + ')');
  return cid;
}

createCharacter('艾琳·晨风', 'dnd5e',
  '一位出生于晨风森林的精灵游侠，自幼与自然为伴。她手持长弓，箭无虚发。',
  '冷静、敏锐，对自然万物怀有深深的敬畏。',
  '黄昏时分的林间空地，她正在照料受伤的鹿灵。',
  '"嘘……别吓到它。"她轻声说道。',
  { system: 'dnd5e', level: 5, attributes: { 力量: 12, 敏捷: 18, 体质: 14, 智力: 13, 感知: 17, 魅力: 14 }, skills: { 察觉: 6, 隐匿: 8, 求生: 5, 运动: 3, 洞察: 4 }, hp: { current: 45, max: 45 }, equipment: ['精製长弓', '双短剑', '游侠斗篷', '旅行背包'], spells: ['动物交谈', '治疗 wounds', '猎人之标记'], backstory: '艾琳·晨风出生在晨风森林的精灵聚落，16岁时独自进入森林深处进行成年试炼。', inventory: [{ name: '精灵干粮', quantity: 7 }, { name: '治疗药水', quantity: 2 }] }
);

createCharacter('张明远', 'coc7th',
  '一位前刑警，如今是私家侦探。经历过太多超乎常理的事件。',
  '务实、坚韧，带着中年人特有的疲惫和幽默感。',
  '办公室门被推开时，他正将脚翘在桌上打盹。',
  '"哈！又有生意上门了。"他打了个哈欠。',
  { system: 'coc7th', level: 3, attributes: { 力量: 55, 体质: 60, 体型: 65, 敏捷: 50, 外貌: 45, 智力: 70, 意志: 65, 教育: 60, 幸运: 40 }, skills: { 侦查: 70, 聆听: 60, 图书馆: 50, 话术: 55, 心理学: 65, 格斗: 50, 火器: 60, 汽车驾驶: 50, 潜行: 40, 追踪: 55 }, hp: { current: 13, max: 13 }, san: { current: 60, max: 65 }, equipment: ['警用左轮（退役）', '折叠刀', '老式相机', '笔记本'], backstory: '曾在市刑警队任职15年，一次涉及邪教祭祀的案件改变了他对世界的认知。', inventory: [{ name: '香烟', quantity: 1 }, { name: '打火机', quantity: 1 }] }
);

createCharacter('无明', 'shadowrun',
  '没有知道无明的真实身份。暗影中的传奇。',
  '沉默寡言，行动力极强。只遵循自己的准则。',
  '新上海霓虹闪烁的天际线下，地下义体诊所的后巷。',
  '"任务细节。"一个经过变声器处理的声音简洁地说。',
  { system: 'shadowrun', level: 6, attributes: { 力量: 4, 敏捷: 7, 体质: 5, 智力: 5, 意志: 6, 魅力: 3, 边缘: 4, '魔法/共鸣': 2 }, skills: { 潜入: 7, 电子战: 5, 破解: 4, 火器: 6, 肉搏: 5, 追踪: 4, 调查: 5, 驾驶: 3, 医疗: 2 }, hp: { current: 11, max: 11 }, equipment: ['数据刺入器', '隐形迷彩服', '智能手枪', '赛博眼（低光/热成像）', '通讯植入体'], backstory: '暗影界最优秀的黑客也找不到他20岁之前的任何记录。', inventory: [{ name: '数据芯片（空白）', quantity: 5 }, { name: '备用电池组', quantity: 2 }] }
);

createCharacter('莉莉丝·暗焰', 'dnd5e',
  '一位拥有恶魔血统的提夫林术士，天生与火焰和混沌能量共鸣。',
  '魅惑、自信、带着危险的魅力。对朋友极度忠诚。',
  '烟雾缭绕的酒吧里，一位紫色皮肤的提夫林女性向你举起酒杯。',
  '"哟，新面孔嘛。"她微笑道。',
  { system: 'dnd5e', level: 4, attributes: { 力量: 8, 敏捷: 14, 体质: 15, 智力: 12, 感知: 10, 魅力: 20 }, skills: { 欺瞒: 7, 游说: 6, 威吓: 5, 秘法: 4, 表演: 6 }, hp: { current: 38, max: 38 }, mp: { current: 14, max: 14 }, equipment: ['法杖', '护身符（恶魔遗物）', '精製匕首'], spells: ['火焰箭', '魅惑人类', '迷幻手稿', '灼热射线', '火球术', '恶魔之语'], backstory: '母亲是人类女巫，父亲是炎魔。她用力量帮助那些需要保护的人。', inventory: [{ name: '施法材料包', quantity: 1 }, { name: '烈酒', quantity: 1 }] }
);

createCharacter('陈国栋', 'custom',
  '一位退休的老刑警，六十出头，在小城开了一家杂货铺。',
  '看似普通实则观察力惊人。性格温和但原则性极强。',
  '城西老城区的小杂货铺，铃铛叮当作响。',
  '"欢迎光临——"他抬起头，目光突然变得锐利。',
  { system: 'custom', level: 2, attributes: { 力量: 10, 敏捷: 12, 智力: 16, 魅力: 14 }, skills: {}, hp: { current: 10, max: 10 }, equipment: ['老花镜', '保温杯', '旧警徽（纪念品）'], backstory: '从警35年，破案无数。退休后在小城安静度日。', inventory: [{ name: '茶叶', quantity: 1 }, { name: '象棋', quantity: 1 }] }
);

// ===== 3. 创建世界书 =====
console.log('\n=== 创建世界书 ===');

function createLorebook(name, description, entries, price) {
  const existing = db.prepare('SELECT id FROM rpg_lorebooks WHERE name = ? AND user_id = ?').get(name, OFFICIAL_ID);
  if (existing) {
    console.log('  跳过（已存在）: ' + name);
    return existing.id;
  }

  const lid = id();
  db.prepare(`
    INSERT INTO rpg_lorebooks (id, name, description, user_id, entries, is_public, st_compatible, license_type, seed_price, download_count, copy_count, avg_rating, rating_count)
    VALUES (?, ?, ?, ?, ?, 1, 1, 'public_free', ?, 0, 0, 4.3, 8)
  `).run(lid, name, description, OFFICIAL_ID, JSON.stringify(entries), price || 0);

  console.log('  [OK] ' + name + ' (' + entries.length + ' entries)');
  return lid;
}

// 世界书 1: 赛博之都·新上海
createLorebook('赛博之都·新上海', '2099年的上海，被巨型企业瓜分的赛博朋克都市。适用于暗影狂奔或赛博朋克题材 TRPG。', [
  { id: id(), keys: ['新上海', '上海', '城市'], content: '新上海是全球最大的城市之一，人口超过6000万。城市分为四层：企业CBD（云顶区）、中产商业区（霓虹层）、工人居住区（灰钢层）、地下世界（深渊层）。', enabled: true, selective: false, priority: 10, constant: true },
  { id: id(), keys: ['企业', '公司', '集团'], content: '新上海由三大巨型企业掌控：昊天集团（生物工程）、银翼科技（AI霸主）、龙王重工（军火制造）。', enabled: true, selective: false, priority: 9, constant: false },
  { id: id(), keys: ['云顶区', '第一层'], content: '城市上空200-500米的悬浮平台，企业精英所在地。最纯净的空气，最美景色，最严安保。', enabled: true, selective: false, priority: 8, constant: false },
  { id: id(), keys: ['霓虹层', '第二层', '商业区'], content: '商业和文化中心，巨大全息广告、商场、娱乐场所。中产阶级居住区。', enabled: true, selective: false, priority: 7, constant: false },
  { id: id(), keys: ['灰钢层', '第三层', '工人区'], content: '城市主体，4000万工人和市民居住。密集拥挤，廉价义体维修店和地下诊所遍布。', enabled: true, selective: false, priority: 8, constant: false },
  { id: id(), keys: ['深渊层', '第四层', '黑市'], content: '地表以下100米的地下世界。亚洲最大黑市「深巷」，可以买到任何东西。没有法律，只有丛林法则。', enabled: true, selective: false, priority: 8, constant: false },
  { id: id(), keys: ['义体', '赛博', '植入体'], content: '义体改装极其普遍。昊天集团「生物融合」系列最受欢迎。未经授权的改装属违法行为。', enabled: true, selective: false, priority: 7, constant: false },
  { id: id(), keys: ['暗网', '深红网络'], content: '加密平行世界「深红网络」。黑客据点：代码坟场（废弃数据中心）、幽灵茶馆（VR茶馆）。', enabled: true, selective: false, priority: 6, constant: false },
  { id: id(), keys: ['反抗军', '自由之翼'], content: '反企业地下组织「自由之翼」。首领「渡鸦」身份成谜。', enabled: true, selective: true, priority: 6, secondary_keys: ['渡鸦', '反抗'], constant: false },
  { id: id(), keys: ['义体猎人'], content: '受雇追逃债改装者的特殊职业。危险但收入丰厚。', enabled: true, selective: false, priority: 5, constant: false },
], 350);

// 世界书 2: 深渊之眼
createLorebook('深渊之眼——克苏鲁神话设定集', '详尽的克苏鲁神话设定集，涵盖阿卡姆到印斯茅斯的东海岸神秘地点。适用于 CoC 7th。', [
  { id: id(), keys: ['阿卡姆', 'Arkham'], content: '马萨诸塞州虚构城市，密斯卡塔尼克大学所在地。阿卡姆精神病院是恐怖传说的中心。', enabled: true, selective: false, priority: 10, constant: true },
  { id: id(), keys: ['密斯卡塔尼克大学'], content: '以稀有古籍收藏和神秘考古学系闻名。图书馆收藏《死灵之书》拉丁文译本。', enabled: true, selective: false, priority: 9, constant: false },
  { id: id(), keys: ['印斯茅斯', 'Innsmouth'], content: '破败海港小镇，居民是深潜者混血后代。1928年联邦政府突袭，但黑暗秘密远未终结。', enabled: true, selective: false, priority: 9, constant: false },
  { id: id(), keys: ['克苏鲁', 'Cthulhu'], content: '旧日支配者，沉睡在拉莱耶古城。当群星归位时将苏醒。', enabled: true, selective: false, priority: 8, constant: false },
  { id: id(), keys: ['死灵之书', 'Necronomicon'], content: '阿拉伯诗人阿尔哈兹莱德所著。记载旧日支配者的秘密。密斯卡塔尼克大学图书馆有藏。', enabled: true, selective: false, priority: 8, constant: false },
  { id: id(), keys: ['奈亚拉托提普'], content: '外神中最活跃者，阿撒托斯的使者。喜欢以人形引诱凡人走向毁灭。', enabled: true, selective: false, priority: 7, constant: false },
  { id: id(), keys: ['深潜者', 'Deep Ones'], content: '两栖类人种族，与人类交配产下混血后代。印斯茅斯居民是其混血后裔。', enabled: true, selective: false, priority: 7, constant: false },
  { id: id(), keys: ['米·戈', 'Mi-Go'], content: '来自犹格斯星的真菌类智慧生命，拥有远超人类的科技水平。', enabled: true, selective: false, priority: 6, constant: false },
  { id: id(), keys: ['SAN', '理智值'], content: '目睹超自然存在、阅读禁忌知识导致理智值下降。低 SAN 值导致恐惧症、失忆等。', enabled: true, selective: false, priority: 10, constant: false },
  { id: id(), keys: ['敦威治', 'Dunwich'], content: '马萨诸塞州西部与世隔绝的山谷小镇，1928年发生著名的敦威治恐怖事件。', enabled: true, selective: false, priority: 6, constant: false },
], 280);

// 世界书 3: 翡翠王国编年史
createLorebook('翡翠王国编年史', '被古老魔法和龙族血脉塑造的大陆。适用于 D&D 5e 奇幻 TRPG。', [
  { id: id(), keys: ['翡翠王国', 'Eldoria'], content: '被古老魔法笼罩的大陆。五大区域：永冻冰川、翡翠之心、龙脊山脉、黄金沙漠、迷雾森林。', enabled: true, selective: false, priority: 10, constant: true },
  { id: id(), keys: ['辉光城', '首都'], content: '翡翠王国首都，白色大理石和魔法晶石建造的宏伟城市。城中最高处是翡翠王座。', enabled: true, selective: false, priority: 9, constant: false },
  { id: id(), keys: ['龙脊山脉', '巨龙'], content: '大陆东部横贯的巨大山脉。各色巨龙居住，埋藏秘银和精金矿藏。', enabled: true, selective: false, priority: 8, constant: false },
  { id: id(), keys: ['迷雾森林', '精灵'], content: '大陆西部大片森林，精灵族家园。深处有通往妖精荒野的传送门。', enabled: true, selective: false, priority: 8, constant: false },
  { id: id(), keys: ['北方冰川', '北境'], content: '永恒冰雪覆盖的荒原。霜巨人部落居住，冰川下埋藏远古文明遗迹。', enabled: true, selective: false, priority: 7, constant: false },
  { id: id(), keys: ['黄金沙漠', '龙裔'], content: '大陆南部炽热沙海。龙裔城市遗迹，龙裔女王「炎鳞」统治。', enabled: true, selective: false, priority: 7, constant: false },
  { id: id(), keys: ['翡翠王座', '国王'], content: '国王阿尔德里克三世失踪三年。王后艾莉安娜担任摄政女王。', enabled: true, selective: false, priority: 9, constant: false },
  { id: id(), keys: ['黑暗教团', '影蛇'], content: '崇拜黑暗神祇的秘密结社「影蛇教」。成员遍布各阶层。', enabled: true, selective: true, priority: 6, secondary_keys: ['影蛇', '邪教'], constant: false },
  { id: id(), keys: ['魔法学院', '奥术'], content: '辉光城魔法学院，五大学派：防护、咒法、预言、附魔、塑能。院长大法师梅瑞狄斯。', enabled: true, selective: false, priority: 7, constant: false },
  { id: id(), keys: ['冒险者公会'], content: '官方职业冒险者组织。分级：青铜/白银/黄金/秘银/龙晶。', enabled: true, selective: false, priority: 8, constant: false },
], 500);

// ===== 4. 上架资产到市场 =====
console.log('\n=== 上架资产到市场 ===');

function listOnMarket(assetType, assetId, price, licenseMode) {
  const existing = db.prepare("SELECT id FROM rpg_market_listings WHERE asset_id = ? AND asset_type = ? AND status = 'active'").get(assetId, assetType);
  if (existing) {
    console.log('  跳过（已在市场）');
    return;
  }

  const feeRate = assetType === 'module' ? 0.15 : 0.10;
  const platformFee = Math.floor(price * feeRate);
  const creatorShare = price - platformFee;

  db.prepare("INSERT INTO rpg_market_listings (id, asset_type, asset_id, seller_id, price, license_mode, status, platform_fee, creator_share) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)")
    .run(id(), assetType, assetId, OFFICIAL_ID, price, licenseMode || 'full_copy', platformFee, creatorShare);

  if (assetType === 'character') {
    db.prepare("UPDATE rpg_characters SET license_type = 'public_full', seed_price = ? WHERE id = ?").run(price, assetId);
  } else if (assetType === 'lorebook') {
    db.prepare("UPDATE rpg_lorebooks SET license_type = 'public_full', seed_price = ? WHERE id = ?").run(price, assetId);
  }

  console.log('  [OK] ' + assetType + ' -> ' + price + ' SEED');
}

const allChars = db.prepare("SELECT id, name FROM rpg_characters WHERE user_id = ? AND license_type = 'public_free'").all(OFFICIAL_ID);
const allLores = db.prepare("SELECT id, name FROM rpg_lorebooks WHERE user_id = ? AND license_type = 'public_free'").all(OFFICIAL_ID);

const charPrices = { '艾琳·晨风': 120, '张明远': 80, '无明': 150, '莉莉丝·暗焰': 100, '陈国栋': 60 };
for (const c of allChars) {
  listOnMarket('character', c.id, charPrices[c.name] || 80, 'full_copy');
}

const lorePrices = { '赛博之都·新上海': 350, '深渊之眼——克苏鲁神话设定集': 280, '翡翠王国编年史': 500 };
for (const l of allLores) {
  listOnMarket('lorebook', l.id, lorePrices[l.name] || 300, 'full_copy');
}

// ===== 5. 添加模拟评价 =====
console.log('\n=== 添加模拟评价 ===');

const listings = db.prepare("SELECT id FROM rpg_market_listings WHERE seller_id = ?").all(OFFICIAL_ID);
const reviews = [
  '非常精緻的作品，设定很完整！',
  '质量很高，物超所值！',
  '内容详尽，AI GM 引用得很自然。',
  '角色背景写得很动人，已经在战役里用了。',
  '这个价位能有这个深度，性价比超高。',
];

let reviewCount = 0;
for (const listing of listings.slice(0, 5)) {
  const r = Math.floor(Math.random() * reviews.length);
  const dummyUser = id();
  db.prepare('INSERT OR IGNORE INTO wallets (user_id, balance, total_earned, total_spent) VALUES (?, 1000, 1000, 0)').run(dummyUser);
  db.prepare("UPDATE rpg_market_listings SET status = 'sold', buyer_id = ? WHERE id = ?").run(dummyUser, listing.id);
  db.prepare('INSERT INTO rpg_creator_ratings (id, listing_id, rater_id, ratee_id, rating, review) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id(), listing.id, dummyUser, OFFICIAL_ID, 4 + (r % 2), reviews[r]);
  reviewCount++;
}
console.log('  Added ' + reviewCount + ' reviews');

console.log('\n=== Seed data complete! ===');
console.log('  Characters: ' + allChars.length);
console.log('  Lorebooks: ' + allLores.length);
console.log('  Listings: ' + listings.length);

db.close();
