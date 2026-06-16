/**
 * 修复并导入剩余5个角色卡
 * 
 * 问题：4个科幻角色的 first_mes 字段缺少引号包裹
 * 纪未来的 JSON 应该是合法的，直接尝试导入
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'novel.db');
const db = new Database(dbPath);

// 角色卡源文件
const SCI_FI_FILE = 'E:\\SaiBohuman\\赛博卧龙\\小说创作\\AI跑团\\人物卡_科幻_v1.0.md';
const FILM_FILE = 'E:\\SaiBohuman\\赛博卧龙\\小说创作\\AI跑团\\人物卡_影视_v1.0.md';

// 要修复的角色
const TARGET_CHARS = ['老焊', '回声', '李星河', '茧', '纪未来'];

function extractCodeBlocks(content) {
  const blocks = [];
  const lines = content.split('\n');
  let inBlock = false;
  let blockStart = -1;
  let blockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '```json' && !inBlock) {
      inBlock = true;
      blockStart = i;
      blockLines = [];
    } else if (line === '```' && inBlock) {
      inBlock = false;
      blocks.push({
        startLine: blockStart,
        endLine: i,
        raw: blockLines.join('\n')
      });
    } else if (inBlock) {
      blockLines.push(lines[i]);
    }
  }
  return blocks;
}

/**
 * 修复 JSON 中缺失引号的 first_mes 字段
 * 模式: "first_mes": *text...  (缺少开引号)
 * 策略: 找到 first_mes 的值边界，提取到下一个合法字段为止
 */
function fixFirstMes(rawJson) {
  // 检查 first_mes 是否有引号问题
  const firstMesMatch = rawJson.match(/"first_mes"\s*:\s*\*/);
  if (!firstMesMatch) {
    // first_mes 格式正常
    return rawJson;
  }

  const startPos = firstMesMatch.index;
  const valueStart = rawJson.indexOf(':', startPos) + 1;
  
  // 从 valueStart 开始，找到这段值的结束位置
  // 策略：找到下一个 "key": 模式（即下一个 JSON 字段）
  // 但要跳过被包裹在字符串内的内容
  
  // 首先收集 first_mes 的多行值
  const afterColon = rawJson.substring(valueStart);
  
  // 寻找下一个 JSON 字段的模式: \n  "fieldname":
  // 这个模式不应该出现在 first_mes 值内部
  const nextFieldPattern = /\n\s*"(mes_example|tags|creator|character_version|system|attributes|skills|equipment|spells|backstory|dynamic_state|flags|relationships|system_prompt|trpg|mes_example)"\s*:/;
  
  const nextFieldMatch = afterColon.match(nextFieldPattern);
  if (!nextFieldMatch) {
    console.error('  无法找到 first_mes 值的结束位置');
    return rawJson;
  }

  // 提取 first_mes 的原始多行值
  const firstMesValue = afterColon.substring(0, nextFieldMatch.index).trim();
  const restOfJson = afterColon.substring(nextFieldMatch.index);

  // 将多行值转换为合法的 JSON 字符串
  const escapedValue = firstMesValue
    .replace(/\\/g, '\\\\')   // 转义反斜杠
    .replace(/"/g, '\\"')     // 转义双引号
    .replace(/\n/g, '\\n')    // 换行符
    .replace(/\r/g, '')       // 去掉回车
    .replace(/\t/g, '\\t');   // 转义 tab

  // 重建 JSON
  const beforeFirstMes = rawJson.substring(0, valueStart);
  const fixedJson = beforeFirstMes + ' "' + escapedValue + '",' + restOfJson;

  return fixedJson;
}

/**
 * 尝试解析 JSON，多种策略
 */
function tryParseJson(raw) {
  // 策略1: 直接解析
  try {
    return JSON.parse(raw);
  } catch (e) {}

  // 策略2: 修复 first_mes 后再解析
  const fixed = fixFirstMes(raw);
  try {
    return JSON.parse(fixed);
  } catch (e) {
    // 尝试定位错误
    const errorMatch = e.message.match(/position (\d+)/);
    if (errorMatch) {
      const pos = parseInt(errorMatch[1]);
      const context = fixed.substring(Math.max(0, pos - 50), pos + 50);
      console.error(`  JSON 解析错误位置 ${pos}: ...${context}...`);
    }
    throw e;
  }
}

function getCharacterGenre(fileName) {
  if (fileName.includes('科幻')) return '科幻';
  if (fileName.includes('影视')) return '影视';
  if (fileName.includes('仙侠')) return '仙侠';
  if (fileName.includes('古代')) return '古代';
  return '未知';
}

function importCharacter(cardData, genre, sourceFile) {
  const name = cardData.name;
  
  // 检查是否已存在
  const existing = db.prepare('SELECT id FROM rpg_characters WHERE name = ?').get(name);
  if (existing) {
    console.log(`  [跳过] ${name} 已存在于数据库中`);
    return false;
  }

  // 构建 card_data JSON
  const cardDataJson = JSON.stringify(cardData);

  // 构建 trpg 扩展数据（如果有的话）
  const trpg = cardData.trpg || {};
  const dynamicState = cardData.dynamic_state || trpg.dynamic_state || {};
  const flags = cardData.flags || trpg.flags || {};
  const relationships = cardData.relationships || trpg.relationships || [];
  const attributes = cardData.attributes || trpg.attributes || {};
  const skills = cardData.skills || trpg.skills || {};

  // 插入数据库
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO rpg_characters (name, card_data, genre, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, cardDataJson, genre, now, now);

  console.log(`  [成功] ${name} (id: ${result.lastInsertRowid})`);
  return true;
}

function processFile(filePath, fileName) {
  console.log(`\n处理文件: ${fileName}`);
  console.log('='.repeat(50));

  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = extractCodeBlocks(content);
  console.log(`找到 ${blocks.length} 个代码块`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    // 先尝试检测 name 字段看是否是目标角色
    const nameMatch = block.raw.match(/"name"\s*:\s*"([^"]+)"/);
    const charName = nameMatch ? nameMatch[1] : '(未知)';
    
    // 只处理目标角色
    if (!TARGET_CHARS.includes(charName)) continue;

    console.log(`\n[${i + 1}] 尝试导入: ${charName}`);

    try {
      const cardData = tryParseJson(block.raw);
      const genre = getCharacterGenre(fileName);
      
      if (importCharacter(cardData, genre, fileName)) {
        imported++;
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`  [失败] ${charName}: ${e.message}`);
      failed++;
      
      // 输出原始 JSON 的前 200 字符用于调试
      console.error(`  原始 JSON 前200字符: ${block.raw.substring(0, 200)}...`);
    }
  }

  return { imported, skipped, failed };
}

// 主流程
console.log('修复导入剩余角色卡');
console.log(`目标: ${TARGET_CHARS.join(', ')}`);
console.log(`数据库: ${dbPath}`);

let totalImported = 0;
let totalSkipped = 0;
let totalFailed = 0;

// 处理科幻人物卡
if (fs.existsSync(SCI_FI_FILE)) {
  const result = processFile(SCI_FI_FILE, '人物卡_科幻_v1.0.md');
  totalImported += result.imported;
  totalSkipped += result.skipped;
  totalFailed += result.failed;
} else {
  console.error(`文件不存在: ${SCI_FI_FILE}`);
}

// 处理影视人物卡
if (fs.existsSync(FILM_FILE)) {
  const result = processFile(FILM_FILE, '人物卡_影视_v1.0.md');
  totalImported += result.imported;
  totalSkipped += result.skipped;
  totalFailed += result.failed;
} else {
  console.error(`文件不存在: ${FILM_FILE}`);
}

console.log('\n' + '='.repeat(50));
console.log(`导入完成: ${totalImported} 新增, ${totalSkipped} 跳过, ${totalFailed} 失败`);

// 显示当前总数
const count = db.prepare('SELECT COUNT(*) as cnt FROM rpg_characters').get();
console.log(`数据库角色总数: ${count.cnt}`);

db.close();
