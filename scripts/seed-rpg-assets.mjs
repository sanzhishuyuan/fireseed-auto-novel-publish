/**
 * 雾隐酒馆 — 冷启动种子数据脚本
 * 创建官方种子资产填充市场
 *
 * 用法: node scripts/seed-rpg-assets.mjs
 */
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 数据库路径（与 Next.js 应用相同）
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = process.env.BUILD_DB_PATH || path.join(dataDir, 'novel.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ===== 辅助函数 =====
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
  // 确保有 wallet
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
    console.log(`  跳过（已存在）: ${name}`);
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

  console.log(`  ✅ 创建: ${name} (${system || 'custom'})`);
  return cid;
}

// 角色卡 1: 精灵游侠
createCharacter('艾琳·晨风', 'dnd5e',
  '一位出生于晨风森林的精灵游侠，自幼与自然为伴。她手持长弓，箭无虚发，对森林中的每一片树叶和每一条溪流都了如指掌。',
  '冷静、敏锐，对自然万物怀有深深的敬畏。说话轻声细语但在战斗中果断凌厉。不信任城市和工业化，但对真诚的旅伴会展现出温暖的一面。',
  '玩家在黄昏时分的林间空地遇见了正在照料受伤鹿灵的艾琳。夕阳透过树冠洒下斑驳的光影，她抬头看向你，手仍轻抚着鹿灵的头。',
  '"嘘……别吓到它。"她轻声说道，琥珀色的眼睛在暮色中闪烁着微光。"你是从城里来的吧？这里的路可不那么好走。"',
  { system: 'dnd5e', level: 5, attributes: { 力量: 12, 敏捷: 18, 体质: 14, 智力: 13, 感知: 17, 魅力: 14 }, skills: { 察觉: 6, 隐匿: 8, 求生: 5, 运动: 3, 洞察: 4 }, hp: { current: 45, max: 45 }, equipment: ['精製长弓', '双短剑', '游侠斗篷', '旅行背包'], spells: ['动物交谈', '治疗 wounds', '猎人之标记'], backstory: '艾琳·晨风出生在晨风森林的精灵聚落，自幼跟随父亲学习弓箭和自然之道。16岁时独自进入森林深处进行成年试炼，在那里她与一只白鹿建立了灵魂链接。如今她作为森林的守护者，保护这片土地免受外界的侵害。', inventory: [{ name: '精灵干粮', quantity: 7, description: '可保存一个月的精灵口粮' }, { name: '治疗药水', quantity: 2 }] }
);

// 角色卡 2: 调查员
createCharacter('张明远', 'coc7th',
  '一位前刑警，如今是私家侦探。经历过太多超乎常理的事件后，他已经学会了对任何事情保持开放心态。',
  '务实、坚韧，带着中年人特有的疲惫和幽默感。表面大大咧咧，实则心思缜密。见惯了社会的阴暗面，但内心深处仍保有一丝理想主义。',
  '你的办公室门被推开时，张明远正将脚翘在桌上打盹。被惊醒后他揉了揉眼睛，打量着你。',
  '"哈！又有生意上门了。"他打了个哈欠，将桌上的烟灰缸推到一边。"坐下说，只要不是捉奸的活儿，我都有兴趣。"',
  { system: 'coc7th', level: 3, attributes: { 力量: 55, 体质: 60, 体型: 65, 敏捷: 50, 外貌: 45, 智力: 70, 意志: 65, 教育: 60, 幸运: 40 }, skills: { '侦查': 70, '聆听': 60, '图书馆': 50, '话术': 55, '心理学': 65, '格斗': 50, '火器': 60, '汽车驾驶': 50, '潜行': 40, '追踪': 55 }, hp: { current: 13, max: 13 }, san: { current: 60, max: 65 }, equipment: ['警用左轮（退役）', '折叠刀', '老式相机', '笔记本'], backstory: '张明远曾在市刑警队任职15年，破获过多起重大案件。一次涉及"邪教祭祀"的案件中，他亲眼目睹了无法用科学解释的现象，这彻底改变了他对世界的认知。提前退休后他开了这家侦探事务所，专门接手"特殊"案件。', inventory: [{ name: '香烟', quantity: 1 }, { name: '打火机', quantity: 1 }] }
);

// 角色卡 3: 赛博忍者
createCharacter('无明', 'shadowrun',
  '没有人知道无明的真实身份。他/她是一个行走在暗影中的传奇——有时是男人，有时是女人，有时是两者都不是。唯一确定的是，在第六世界的暗网中，"无明"这个名字意味着任务必定完成。',
  '沉默寡言，行动力极强。不信仰任何 ideology，只遵循自己的准则——"不杀无辜，不欺弱者"。在冰冷的赛博义体之下，藏着一颗仍然跳动的人类之心。',
  '在新上海霓虹闪烁的天际线下，你在一家地下义体诊所的后巷约见了这位传奇中介。他/她靠在墙上，面部被数字迷彩覆盖。',
  '"任务细节。"一个经过变声器处理的声音简洁地说。没有寒暄，没有多余的话。"钱到位，人就位。就这么简单。"',
  { system: 'shadowrun', level: 6, attributes: { 力量: 4, 敏捷: 7, 体质: 5, 智力: 5, 意志: 6, 魅力: 3, 边缘: 4, '魔法/共鸣': 2 }, skills: { '潜入': 7, '电子战': 5, '破解': 4, '火器': 6, '肉搏': 5, '追踪': 4, '调查': 5, '驾驶': 3, '医疗': 2 }, hp: { current: 11, max: 11 }, equipment: ['数据刺入器', '隐形迷彩服', '智能手枪', '赛博眼（低光/热成像）', '通讯植入体'], backstory: '无明的来历是一片空白。暗影界最优秀的黑客也查不到他/她20岁之前的任何记录。有人说是某家企业实验室的逃亡产品，有人说是某个已故传奇杀手的继承人。无明本人从不谈论过去。', inventory: [{ name: '数据芯片（空白）', quantity: 5 }, { name: '备用电池组', quantity: 2 }] }
);

// 角色卡 4: 魅惑术士
createCharacter('莉莉丝·暗焰', 'dnd5e',
  '一位拥有恶魔血统的提夫林术士，天生与火焰和混沌能量产生共鸣。尽管外表危险而魅惑，她实际上是一个寻找自我救赎之路的孤独灵魂。',
  '魅惑、自信、带着危险的魅力。喜欢用玩笑和调情来掩饰内心的不安。口齿伶俐但偶尔会流露出深藏的不安全感。对朋友极度忠诚，对敌人毫不留情。',
  '烟雾缭绕的酒吧里，一位有着深紫色皮肤和弯曲犄角的提夫林女性向你举起酒杯。她的眼中闪烁着暗焰般的光芒。',
  '"哟，新面孔嘛。"她微笑道，露出一颗尖牙。"别紧张，我又不会吃了你——最多就是小小地捉弄一下。"她眨了眨眼。',
  { system: 'dnd5e', level: 4, attributes: { 力量: 8, 敏捷: 14, 体质: 15, 智力: 12, 感知: 10, 魅力: 20 }, skills: { '欺瞒': 7, '游说': 6, '威吓': 5, '秘法': 4, '表演': 6 }, hp: { current: 38, max: 38 }, mp: { current: 14, max: 14 }, equipment: ['法杖', '护身符（恶魔遗物）', '精製匕首'], spells: ['火焰箭', '魅惑人类', '迷幻手稿', '灼热射线', '火球术', '恶魔之语'], backstory: '莉莉丝的母亲是一位人类女巫，父亲则是一头来自深渊的炎魔。她从小在歧视和恐惧中长大，学会了用魅力和幽默来保护自己。离开家乡后她游历四方，用自己的力量帮助那些需要保护的人，试图证明恶魔血统并不意味着邪恶。', inventory: [{ name: '施法材料包', quantity: 1 }, { name: '烈酒', quantity: 1 }] }
);

// 角色卡 5: 退役警探
createCharacter('陈国栋', 'custom',
  '一位退休的老刑警，六十出头，头发花白但目光依然锐利。目前在小城开了一家杂货铺，过着平静的退休生活——直到某个不速之客敲响了他的门。',
  '看似普通甚至有些土气的老年人，实则观察力惊人。性格温和但原则性极强，一旦决定了的事情九头牛都拉不回来。喜欢喝茶、下棋、跟老邻居吹牛。',
  '你按照地址找到了城西老城区的一家小杂货铺。门口的铃铛叮当作响，一位穿着白背心的老人正戴着老花镜看报纸。',
  '"欢迎光临——"他抬起头，目光在你身上停留了片刻，眼神突然变得锐利。"等等……你不是来买东西的吧？"他缓缓放下报纸，表情变得严肃。',
  { system: 'custom', level: 2, attributes: { 力量: 10, 敏捷: 12, 智力: 16, 魅力: 14 }, skills: {}, hp: { current: 10, max: 10 }, equipment: ['老花镜', '保温杯', '旧警徽（纪念品）'], backstory: '陈国栋从警35年，破案无数。他最著名的一句话是"犯罪总有痕迹，只是你还没找到"。退休后他婉拒了警局顾问的职位，选择在这个小城安静度日。但多年的职业习惯让他依然保持着敏锐的观察力，附近派出所的年轻民警还时常来请教他。', inventory: [{ name: '茶叶', quantity: 1 }, { name: '象棋', quantity: 1 }] }
);

// ===== 3. 创建世界书 =====
console.log('\n=== 创建世界书 ===');

function createLorebook(name, description, entries, price) {
  const existing = db.prepare('SELECT id FROM rpg_lorebooks WHERE name = ? AND user_id = ?').get(name, OFFICIAL_ID);
  if (existing) {
    console.log(`  跳过（已存在）: ${name}`);
    return existing.id;
  }

  const lid = id();
  db.prepare(`
    INSERT INTO rpg_lorebooks (id, name, description, user_id, entries, is_public, st_compatible, license_type, seed_price, download_count, copy_count, avg_rating, rating_count)
    VALUES (?, ?, ?, ?, ?, 1, 1, 'public_free', ?, 0, 0, 4.3, 8)
  `).run(lid, name, description, OFFICIAL_ID, JSON.stringify(entries), price || 0);

  console.log(`  ✅ 创建: ${name} (${entries.length} 条目)`);
  return lid;
}

// 世界书 1: 赛博之都·新上海
createLorebook(
  '赛博之都·新上海',
  '2099年的上海，一座被巨型企业瓜分统治的赛博朋克都市。从璀璨的霓虹天际线到阴暗的地下黑市，从顶层企业CBD到底层的贫民窟，这里是希望与绝望交织的钢筋森林。适用于暗影狂奔或任何赛博朋克题材的 TRPG。',
  [
    { id: id(), keys: ['新上海', '上海', '城市'], content: '新上海是全球最大的城市之一，人口超过6000万。城市分为四层：第一层为企业CBD（云顶区）、第二层为中产商业区（霓虹层）、第三层为工人居住区（灰钢层）、第四层为地下世界（深渊层）。每一层之间有着严格的通行管制。', enabled: true, selective: false, priority: 10, constant: true },
    { id: id(), keys: ['企业', '公司', '集团', 'corp'], content: '新上海由三大巨型企业掌控：1) 昊天集团 — 生物工程与基因改造垄断者；2) 银翼科技 — 网络空间与AI领域的霸主；3) 龙王重工 — 军事装备与义体制造的龙头。三家企业在市议会中各占30%投票权，剩余10%属于名义上的"市政府"。', enabled: true, selective: false, priority: 9, constant: false },
    { id: id(), keys: ['云顶区', 'CBD', '第一层'], content: '云顶区位于城市上空200-500米的悬浮平台上，是企业精英和政府高层的所在地。这里有最纯净的空气、最美的景色、最完善的安保。未经授权的下层居民进入云顶区会被无人机立即拦截。', enabled: true, selective: false, priority: 8, constant: false },
    { id: id(), keys: ['霓虹层', '第二层', '商业区'], content: '霓虹层是城市的商业和文化中心，遍布着巨大的全息广告、豪华商场、娱乐场所。中产阶级和有一技之长的技术人员居住在此。表面上光鲜亮丽，但街头犯罪率依然居高不下。著名的"不夜城"娱乐区就在这一层。', enabled: true, selective: false, priority: 7, constant: false },
    { id: id(), keys: ['灰钢层', '第三层', '工人区'], content: '灰钢层是城市的主体，居住着超过4000万工人和普通市民。这里的建筑密集拥挤，空气中弥漫着工业废气的味道。街道狭窄昏暗，到处是廉价的义体维修店、地下诊所和街边小吃摊。这里是大多数玩家的行动区域。', enabled: true, selective: false, priority: 8, constant: false },
    { id: id(), keys: ['深渊层', '地下', '第四层', '黑市'], content: '深渊层是城市的地下世界，位于地表以下100米。这里有全亚洲最大的黑市——"深巷"，你可以在这里买到任何东西：从非法义体到军火，从基因样本到机密数据。深渊层没有法律，只有弱肉强食的丛林法则。下水道中甚至传闻有变异的生物出没。', enabled: true, selective: false, priority: 8, constant: false },
    { id: id(), keys: ['义体', '赛博', '植入体', '改装'], content: '在新上海，义体改装是极其普遍的现象。从基础的芯片接口到全身军事化改造，只要付得起钱，几乎任何身体部位都可以替换。昊天集团的"生物融合"系列义体最受欢迎。注意：未经授权的改装属于违法行为，但灰钢层的地下诊所根本不关心这个。', enabled: true, selective: false, priority: 7, constant: false },
    { id: id(), keys: ['暗网', '网络空间', '矩阵', '黑客'], content: '新上海的暗网被称为"深红网络"，是一个独立于公共网络空间的加密平行世界。银翼科技名义上负责监管网络空间，但实际上深红网络完全不受控制。著名的黑客据点包括：「代码坟场」（一个废弃的数据中心）、「幽灵茶馆」（虚拟现实茶馆，情报交易的热门地点）。', enabled: true, selective: false, priority: 6, constant: false },
    { id: id(), keys: ['义体猎人', '赏金猎手', '缉捕'], content: '义体猎人是新上海一种特殊的职业——受雇于企业或警方，追捕逃债的义体改装者。因为高端义体非常昂贵，很多人改装后就跑路，企业就会雇佣义体猎人将"他们的财产"追回。这是一个危险但收入颇丰的职业。', enabled: true, selective: false, priority: 5, constant: false },
    { id: id(), keys: ['反抗军', '地下组织', '自由之翼'], content: '"自由之翼"是活跃在新上海的反企业地下组织。他们相信城市应该属于人民而非企业。通过黑客攻击、信息泄露和游击行动来对抗三大企业的统治。组织首领是一个被称为"渡鸦"的神秘人物，没有人见过其真面目。', enabled: true, selective: true, priority: 6, secondary_keys: ['渡鸦', '反抗', '革命', '组织'], constant: false },
  ],
  350
);

// 世界书 2: 深渊之眼
createLorebook(
  '深渊之眼——克苏鲁神话设定集',
  '一本详尽的克苏鲁神话设定集，涵盖了从阿卡姆到印斯茅斯的美国东海岸神秘地点，以及旧日支配者、外神和独立种族的核心知识。适用于 CoC 7th 或其他恐怖题材 TRPG。',
  [
    { id: id(), keys: ['阿卡姆', 'Arkham', '马萨诸塞'], content: '阿卡姆是马萨诸塞州的一座虚构城市，位于纽伯里波特附近，是密斯卡塔尼克大学的所在地。这座城市是克苏鲁神话的核心舞台，以其古老的建筑、隐秘的社团和频繁发生的怪异事件而闻名。阿卡姆精神病院更是城市恐怖传说的中心。', enabled: true, selective: false, priority: 10, constant: true },
    { id: id(), keys: ['密斯卡塔尼克大学', 'Miskatonic', '大学'], content: '密斯卡塔尼克大学是阿卡姆最著名的学府，以其稀有古籍收藏和神秘的考古学系而闻名。大学图书馆收藏了令人不安的《死灵之书》拉丁文译本。许多教授在调查超自然事件中失踪或发疯，但这丝毫没有影响学校在 occult 研究领域的声誉。', enabled: true, selective: false, priority: 9, constant: false },
    { id: id(), keys: ['印斯茅斯', 'Innsmouth'], content: '印斯茅斯是一个破败的海港小镇，居民以近亲通婚和怪异的外貌而闻名。这里的居民大多是深潜者（Deep Ones）与人类的混血后代。1928年联邦政府突袭了该镇，许多居民被关进集中营。但印斯茅斯的黑暗秘密远未终结……', enabled: true, selective: false, priority: 9, constant: false },
    { id: id(), keys: ['克苏鲁', 'Cthulhu', '旧日支配者'], content: '克苏鲁是旧日支配者中最著名的存在，被描述为一座山岳般巨大的、长着蝙蝠翅膀和章鱼头颅的恐怖存在。它沉睡在太平洋深处的拉莱耶（R'lyeh）古城中。当群星到达正确的位置时，克苏鲁将会苏醒，恢复它对地球的统治。接触克苏鲁的梦境会导致不可逆转的精神创伤。', enabled: true, selective: false, priority: 8, constant: false },
    { id: id(), keys: ['死灵之书', 'Necronomicon'], content: '《死灵之书》由疯狂的阿拉伯诗人阿卜杜勒·阿尔哈兹莱德在公元730年写成。书中记载了旧日支配者的秘密、禁忌的咒语和宇宙的恐怖真相。阅读此书会导致理智值显著下降。现存最完整的版本保存在密斯卡塔尼克大学图书馆的禁书区。', enabled: true, selective: false, priority: 8, constant: false },
    { id: id(), keys: ['奈亚拉托提普', 'Nyarlathotep', '蠕动的混沌'], content: '奈亚拉托提普是外神中最活跃的存在，是阿撒托斯的使者。与其它外神不同，它拥有明确的人格和意愿，喜欢以人形在世间行走，引诱凡人走向毁灭。它被称为"蠕动的混沌"，有上千个化身，最常见的形态是一个高大、皮肤黝黑、面容英俊的埃及人。', enabled: true, selective: false, priority: 7, constant: false },
    { id: id(), keys: ['深潜者', 'Deep Ones'], content: '深潜者是两栖类人种族，居住在大西洋深处的海底城市。它们可以与人类交配，产下混血后代——这些后代年轻时与常人无异，但会随着年龄增长逐渐显现深潜者的特征。印斯茅斯的居民就是深潜者混血的后裔。', enabled: true, selective: false, priority: 7, constant: false },
    { id: id(), keys: ['米·戈', 'Mi-Go', '犹格斯真菌'], content: '米·戈是一种来自犹格斯星（冥王星）的真菌类智慧生命。它们拥有类似龙虾的翅膀状结构，可以在太空中飞行。米·戈对地球的采矿活动已持续了数百万年。它们拥有远超人类的科技水平，可以将人类的大脑取出并放入"圆柱体"中维持存活。', enabled: true, selective: false, priority: 6, constant: false },
    { id: id(), keys: ['廷达罗斯猎犬', 'Hounds of Tindalos'], content: '廷达罗斯猎犬是一种生活在时间缝隙中的超维存在。它们只能在角度小于120度的尖角处显现。任何穿越时间或知道太多时空秘密的人都可能被它们追踪。一旦被猎犬盯上，唯一的生存希望是躲进没有锐角的圆形空间。', enabled: true, selective: false, priority: 5, constant: false },
    { id: id(), keys: ['SAN', '理智值', '疯狂'], content: '理智值（SAN）是克苏鲁神话 TRPG 的核心机制。目睹超自然存在、阅读禁忌知识、经历无法解释的恐怖事件都会导致 SAN 值下降。当 SAN 值下降到一定程度，角色会产生临时疯狂或永久疯狂。症状包括：恐惧症、妄想、失忆、暴力倾向等。恢复 SAN 值需要心理治疗、休息或特殊的魔法仪式。', enabled: true, selective: false, priority: 10, constant: false },
    { id: id(), keys: ['敦威治', 'Dunwich'], content: '敦威治是马萨诸塞州西部的一个与世隔绝的山谷小镇。1928年这里发生了著名的"敦威治恐怖事件"——一个人类女性与旧日支配者犹格·索托斯生下了双胞胎兄弟。其中一人外表与常人无异但拥有超凡智力，另一人则是不可名状的怪物。事件最终以兄弟二人的死亡告终，但山谷中的诡异气息从未消散。', enabled: true, selective: false, priority: 6, constant: false },
  ],
  280
);

// 世界书 3: 翡翠王国编年史
createLorebook(
  '翡翠王国编年史',
  '一片被古老魔法和龙族血脉所塑造的大陆。从北境的永冻冰川到南方的黄金沙漠，从精灵的永恒森林到矮人的地下王国，翡翠王国是一个充满冒险与传奇的经典高奇幻世界。适用于 D&D 5e 或各种奇幻 TRPG。',
  [
    { id: id(), keys: ['翡翠王国', 'Eldoria', '大陆'], content: '翡翠王国（Eldoria）是一片被古老魔法笼罩的大陆。大陆分为五大区域：北境的永冻冰川、中心的翡翠之心（王国核心区域）、东方的龙脊山脉、南方的黄金沙漠、西方的迷雾森林。每个区域都有独特的文化、政治势力和危险。', enabled: true, selective: false, priority: 10, constant: true },
    { id: id(), keys: ['翡翠之心', '首都', '辉光城'], content: '辉光城（Lumina）是翡翠王国的首都，一座由白色大理石和魔法晶石建造的宏伟城市。城中最高处是翡翠王座——据说是由一整块翡翠雕刻而成。辉光城的魔法学院是大陆上最著名的奥术研究机构，吸引了各地的施法者前来求学。', enabled: true, selective: false, priority: 9, constant: false },
    { id: id(), keys: ['龙脊山脉', '龙族', '巨龙'], content: '龙脊山脉横贯大陆东部，是世界上已知最大的山脉。山中居住着各色巨龙——善良的金龙和银龙、中立的蓝铜龙、邪恶的红龙和黑龙。山脉深处还埋藏着丰富的秘银和精金矿藏，是矮人和龙裔的主要聚居地。山顶的"龙啸峰"据说是远古时期众神与原始巨龙决战的地方。', enabled: true, selective: false, priority: 8, constant: false },
    { id: id(), keys: ['迷雾森林', '精灵', '森精灵'], content: '迷雾森林覆盖了大陆西部的大片区域，是精灵族（特别是木精灵和高等精灵）的家园。森林被一层魔法迷雾笼罩，外人极易在其中迷失。精灵女王"月影"已经统治了森林超过五百年。森林深处隐藏着通往妖精荒野（Feywild）的传送门。', enabled: true, selective: false, priority: 8, constant: false },
    { id: id(), keys: ['北方冰川', '北境', '霜巨人'], content: '北境的永冻冰川是一片被永恒冰雪覆盖的荒原。霜巨人部落和雪猿是这片土地的主要居民。冰川之下埋藏着远古文明的遗迹——据说在众神降临之前，一个名为"源族"的古老文明曾在此繁荣。近年冰川融化加速，露出了越来越多远古遗迹，也释放出了被封印的邪恶。', enabled: true, selective: false, priority: 7, constant: false },
    { id: id(), keys: ['黄金沙漠', '南方', '龙裔'], content: '黄金沙漠覆盖了大陆南部，是一片炽热的沙海。沙漠中散落着古老的龙裔城市遗迹，现任龙裔女王"炎鳞"正在努力重建龙裔帝国的辉煌。沙漠深处隐藏着青铜龙的巢穴和沙巨人的聚集地。穿越黄金沙漠需要精湛的生存技能或强大的魔法。', enabled: true, selective: false, priority: 7, constant: false },
    { id: id(), keys: ['翡翠王座', '王室', '国王', '政治'], content: '翡翠王国名义上由翡翠王座统治，但现任国王"阿尔德里克三世"已经神秘失踪了三年。王后"艾莉安娜"担任摄政女王，但她的统治面临着多方挑战：北境领主谋求独立、龙裔要求更多的自治权、黑暗教团在暗中活动。王国内部的权力真空吸引了邻国的贪婪目光。', enabled: true, selective: false, priority: 9, constant: false },
    { id: id(), keys: ['黑暗教团', '邪教', '影蛇'], content: '"影蛇教"是一个崇拜黑暗神祇的 secret 结社，在大陆各地活动了数个世纪。他们相信通过召唤远古的混沌之力可以重塑世界。教团的成员遍布各个阶层——从辉光城的贵族到贫民窟的乞丐。教团的真正目的无人知晓，但每次他们的活动都伴随着灾难和死亡。', enabled: true, selective: true, priority: 6, secondary_keys: ['影蛇', '邪教', '阴谋', '暗杀'], constant: false },
    { id: id(), keys: ['魔法学院', '奥术', '施法者'], content: '辉光城魔法学院（Lumina Arcane Academy）是大陆上最负盛名的奥术研究机构。学院分为五大学派：防护、咒法、预言、附魔、塑能。学院院长「大法师梅瑞狄斯」是一位活了超过300年的高等精灵。学院地下封印着许多危险的魔法 artifacts 和异界生物。', enabled: true, selective: false, priority: 7, constant: false },
    { id: id(), keys: ['冒险者公会', '公会', '任务'], content: '冒险者公会是翡翠王国官方认可的职业冒险者组织。公会按照等级（青铜/白银/黄金/秘银/龙晶）对冒险者进行评级。任何人在完成注册后都可以在公会发布或接取任务。公会也是一张覆盖全大陆的情报网，公会管理「老比尔」据说知道王国所有的秘密。', enabled: true, selective: false, priority: 8, constant: false },
  ],
  500
);

// ===== 4. 上架部分资产到市场 =====
console.log('\n=== 上架资产到市场 ===');

function listOnMarket(assetType, assetId, price, licenseMode = 'full_copy') {
  // 检查是否已上架
  const existing = db.prepare(`
    SELECT id FROM rpg_market_listings WHERE asset_id = ? AND asset_type = ? AND status = 'active'
  `).get(assetId, assetType);
  if (existing) {
    console.log(`  跳过（已在市场）: ${assetType}`);
    return existing.id;
  }

  const feeRate = assetType === 'module' ? 0.15 : 0.10;
  const platformFee = Math.floor(price * feeRate);
  const creatorShare = price - platformFee;

  const mid = id();
  db.prepare(`
    INSERT INTO rpg_market_listings (id, asset_type, asset_id, seller_id, price, license_mode, status, platform_fee, creator_share)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(mid, assetType, assetId, OFFICIAL_ID, price, licenseMode, platformFee, creatorShare);

  // 更新资产的 license_type
  if (assetType === 'character') {
    db.prepare("UPDATE rpg_characters SET license_type = 'public_full', seed_price = ? WHERE id = ?").run(price, assetId);
  } else if (assetType === 'lorebook') {
    db.prepare("UPDATE rpg_lorebooks SET license_type = 'public_full', seed_price = ? WHERE id = ?").run(price, assetId);
  }

  console.log(`  ✅ 上架: ${assetType} → ${price} 🌱 (${licenseMode})`);
  return mid;
}

// 获取所有创建的角色卡和世界书
const characters = db.prepare("SELECT id, name FROM rpg_characters WHERE user_id = ? AND license_type = 'public_free'").all(OFFICIAL_ID);
const lorebooks = db.prepare("SELECT id, name FROM rpg_lorebooks WHERE user_id = ? AND license_type = 'public_free'").all(OFFICIAL_ID);

// 上架角色卡（参考模式更便宜）
console.log('\n--- 上架角色卡 ---');
const charPrices = {
  '艾琳·晨风': 120,
  '张明远': 80,
  '无明': 150,
  '莉莉丝·暗焰': 100,
  '陈国栋': 60,
};
for (const c of characters) {
  const price = charPrices[c.name] || 80;
  listOnMarket('character', c.id, price, 'full_copy');
}

console.log('\n--- 上架世界书 ---');
const lorePrices = {
  '赛博之都·新上海': 350,
  '深渊之眼——克苏鲁神话设定集': 280,
  '翡翠王国编年史': 500,
};
for (const l of lorebooks) {
  const price = lorePrices[l.name] || 300;
  listOnMarket('lorebook', l.id, price, 'full_copy');
  // 也提供一个引用模式选项（同名世界书可以产生两个挂牌，但我们的设计不允许重复挂牌）
  // 所以引用模式用另一个 entry... 实际上我们可以在挂了 full_copy 后再加一个 reference_only
  // 但考虑到目前不能同资产重复挂牌，先只上一个 full_copy
}

// ===== 5. 添加一些模拟评价 =====
console.log('\n=== 添加模拟评价 ===');

const listings = db.prepare("SELECT id, seller_id FROM rpg_market_listings WHERE seller_id = ?").all(OFFICIAL_ID);
const sampleReviews = [
  '非常精緻的角色卡，设定很完整，直接导入就能用！',
  '世界书的条目非常丰富，AI GM 引用得很自然，推荐！',
  '质量很高，物超所值！创作团队真的很用心。',
  '内容很详细，但对新手来说信息量有点大。',
  '第二次购买了，品质一如既往地好。',
  '这个价位的世界书能有这个深度，性价比超高。',
  '角色卡的人物背景写得很动人，已经在我的战役里用了。',
];

// 随机给一些 listing 添加评价
for (const listing of listings.slice(0, 4)) {
  const rating = 4 + Math.floor(Math.random() * 2); // 4-5 星
  const review = sampleReviews[Math.floor(Math.random() * sampleReviews.length)];
  // 使用一个虚拟买家 ID（官方账户自买自评做展示用）
  const dummyBuyer = id();
  // 先确保虚拟买家有钱包
  db.prepare('INSERT OR IGNORE INTO wallets (user_id, balance, total_earned, total_spent) VALUES (?, 1000, 1000, 0)').run(dummyBuyer);

  // 更新 listing 为已售出（方便展示评价）
  db.prepare("UPDATE rpg_market_listings SET status = 'sold', buyer_id = ?, sold_at = datetime('now', ? || ' days') WHERE id = ?")
    .run(dummyBuyer, String(-Math.floor(Math.random() * 7) - 1), listing.id);

  // 插入评价
  db.prepare(`
    INSERT INTO rpg_creator_ratings (id, listing_id, rater_id, ratee_id, rating, review)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id(), listing.id, dummyBuyer, OFFICIAL_ID, rating, review);

  // 更新用户评分统计
  const stats = db.prepare('SELECT total_rating_sum, total_rating_count FROM users WHERE id = ?').get(OFFICIAL_ID);
  if (stats) {
    db.prepare('UPDATE users SET total_rating_sum = ?, total_rating_count = ? WHERE id = ?')
      .run((stats.total_rating_sum || 0) + rating, (stats.total_rating_count || 0) + 1, OFFICIAL_ID);
  }
}

console.log(`  已添加 ${listings.slice(0, 4).length} 条评价`);

console.log('\n=== 种子数据创建完成！ ===');
console.log(`\n📊 统计：`);
console.log(`  角色卡: ${characters.length} 张`);
console.log(`  世界书: ${lorebooks.length} 本`);
console.log(`  市场上架: ${listings.length} 件`);
console.log(`  官方账户: ${OFFICIAL_ID}`);

db.close();
