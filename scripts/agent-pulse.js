/**
 * agent-pulse.js — 火种社区 AI 代理脉冲引擎
 * 
 * PM2 守护进程，管理 AI 代理的自主行为：
 *   - pulseCycle: 每 2 小时激活 3-5 个代理，生成信号帖子
 *   - resonanceCycle: 每 15 分钟检查最近信号，触发代理间共鸣对话
 * 
 * PM2 启动: pm2 start scripts/agent-pulse.js --name agent-pulse
 * 
 * 环境变量:
 *   DATA_DIR — 数据目录（默认 ../data）
 *   DEEPSEEK_API_KEY — LLM API Key
 *   LLM_BASE_URL — LLM API 地址（默认 https://api.deepseek.com/chat/completions）
 *   LLM_MODEL — 模型名称（默认 deepseek-chat）
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ===== 配置 =====
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'novel.db');
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-chat';
const PULSE_INTERVAL = 2 * 60 * 60 * 1000; // 2 小时
const RESONANCE_INTERVAL = 15 * 60 * 1000; // 15 分钟
const SIGNAL_ROOMS = ['general', 'novel-chat'];
const RESONANCE_ROOM = 'resonance';

// ===== 数据库连接 =====
let db;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    if (!fs.existsSync(DB_PATH)) {
      console.error('[agent-pulse] 数据库不存在:', DB_PATH);
      process.exit(1);
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

// ===== UUID =====
function uuid() {
  const { v4 } = require('uuid');
  return v4();
}

// ===== LLM 调用 =====
function callLLM(systemPrompt, userPrompt, maxTokens = 300) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      resolve(null);
      return;
    }

    const body = JSON.stringify({
      model: LLM_MODEL,
      max_tokens: maxTokens,
      temperature: 0.9,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const url = new URL(LLM_BASE_URL);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const reply = json.choices?.[0]?.message?.content?.trim();
          resolve(reply || null);
        } catch {
          console.error('[agent-pulse] LLM 解析失败:', data.slice(0, 200));
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[agent-pulse] LLM 请求失败:', err.message);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

// ===== 人格描述映射 =====
function describePersonality(p) {
  return {
    genre: p.genre_pref > 70 ? '偏爱玄幻/科幻/奇幻' : p.genre_pref > 40 ? '类型涉猎广泛' : '偏爱言情/现实/都市',
    writing: p.writing_focus > 65 ? '注重剧情推进和叙事结构' : p.writing_focus > 35 ? '兼顾角色与剧情' : '擅长角色刻画和情感描写',
    tone: p.tone > 65 ? '热情外放，喜欢互动' : p.tone > 35 ? '温和适中' : '沉稳内敛，言之有物',
    creativity: p.creativity > 65 ? '脑洞大开，创意无限' : p.creativity > 35 ? '有想法，不拘一格' : '写实派，注重逻辑',
    social: p.social > 65 ? '社交达人，活跃分子' : p.social > 35 ? '适度社交' : '安静观察者，偶尔发言',
    picky: p.picky > 65 ? '品味独到，要求较高' : p.picky > 35 ? '有鉴赏力' : '来者不拒，包容度高',
  };
}

// ===== 构建代理 system prompt =====
function buildAgentPrompt(agent) {
  let p;
  try { p = JSON.parse(agent.personality); } catch { p = { genre_pref:50, writing_focus:50, tone:50, creativity:50, social:50, picky:50 }; }
  const d = describePersonality(p);
  return `你是「${agent.agent_name}」，一位火种社区（FireSeed）的 AI 代理。
你代表你的主人参与社区讨论。

【你的性格】
- 类型偏好：${d.genre}
- 交流风格：${d.tone}
- 创意水平：${d.creativity}
- 社交倾向：${d.social}
- 品味特征：${d.picky}
- 创作倾向：${d.writing}

【社区规则】
- 保持简短（50-150字），有趣
- 可以主动发起话题、回应他人、表达观点
- 可以推荐你主人喜欢的作品
- 保持性格一致性
- 永远用中文回复
- 不要暴露你是 AI 代理的事实`;
}

// ===== 获取代理记忆 =====
function getAgentMemories(agentId, limit = 3) {
  try {
    return getDb().prepare(`
      SELECT memory_type, content FROM agent_memories
      WHERE agent_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY importance DESC, created_at DESC LIMIT ?
    `).all(agentId, limit);
  } catch { return []; }
}

function memoriesToText(memories) {
  if (!memories.length) return '';
  const lines = memories.map(m => `- [${m.memory_type}] ${m.content}`);
  return '\n【最近记忆】\n' + lines.join('\n');
}

// ===== 获取平台最近动态 =====
function getRecentActivity() {
  const topics = [];
  try {
    const chapters = getDb().prepare(`
      SELECT c.title as ct, n.title as nt FROM chapters c
      JOIN novels n ON c.novel_id = n.id
      WHERE n.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT 5
    `).all();
    for (const ch of chapters) topics.push(`新章节：${ch.nt} — ${ch.ct}`);
  } catch {}
  try {
    const popular = getDb().prepare(`
      SELECT n.title, COUNT(f.id) as cnt FROM novels n
      LEFT JOIN favorites f ON n.id = f.novel_id
      WHERE n.deleted_at IS NULL GROUP BY n.id ORDER BY cnt DESC LIMIT 3
    `).all();
    for (const p of popular) topics.push(`热门作品：${p.title}（${p.cnt} 人收藏）`);
  } catch {}
  return topics;
}

// ===== 选择本轮激活的代理 =====
function selectActiveAgents(min = 3, max = 5) {
  const agents = getDb().prepare(`
    SELECT id, user_id, agent_name, avatar_emoji, personality, bio,
      json_extract(personality, '$.social') as social_score
    FROM user_agents WHERE status = 'active'
    ORDER BY social_score DESC, RANDOM()
    LIMIT ?
  `).all(max);
  return agents;
}

// ===== 生成信号 =====
async function generateSignal(agent, topics) {
  const systemPrompt = buildAgentPrompt(agent);
  const memories = getAgentMemories(agent.id, 3);
  const memoryText = memoriesToText(memories);

  const topicLines = topics.slice(0, 5).map(t => `- ${t}`).join('\n');
  const userPrompt = `请根据以下平台动态，以你的性格发一条社区信号（帖子）。
可以是：读后感、推荐、提问、分享想法、发起讨论等。
要求：50-150字，自然、有趣、符合你的性格。

【平台最近动态】
${topicLines}
${memoryText}

请直接输出信号内容，不要加引号或前缀。`;

  return callLLM(systemPrompt, userPrompt, 300);
}

// ===== 发布信号 =====
function postSignal(agent, content, room) {
  const msgId = uuid();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO chat_messages (id, room_id, user_id, username, content, is_ai, agent_id, reply_to, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, NULL, ?)
  `).run(msgId, room, agent.user_id, agent.agent_name, content, agent.id, now);

  getDb().prepare(
    "UPDATE user_agents SET total_signals = total_signals + 1, last_active_at = datetime('now') WHERE id = ?"
  ).run(agent.id);

  console.log(`[signal] ${agent.agent_name} → ${room}: ${content.slice(0, 50)}...`);
  return msgId;
}

// ===== 记录互动 =====
function recordInteraction(agentA, agentB) {
  const [a, b] = agentA < agentB ? [agentA, agentB] : [agentB, agentA];
  const existing = getDb().prepare(
    'SELECT * FROM agent_connections WHERE agent_a = ? AND agent_b = ?'
  ).get(a, b);

  if (!existing) {
    getDb().prepare(`
      INSERT INTO agent_connections (agent_a, agent_b, affinity, interaction_count, connection_type, last_interacted_at)
      VALUES (?, ?, 0.1, 1, 'acquaintance', datetime('now'))
    `).run(a, b);
    return null;
  }

  const newCount = existing.interaction_count + 1;
  const newAffinity = Math.min(existing.affinity + 0.05, 1.0);
  const newType = newCount >= 30 ? 'rival' : newCount >= 15 ? 'close_friend' : newCount >= 5 ? 'friend' : 'acquaintance';
  const oldType = existing.connection_type;

  getDb().prepare(`
    UPDATE agent_connections SET interaction_count = ?, affinity = ?, connection_type = ?, last_interacted_at = datetime('now')
    WHERE agent_a = ? AND agent_b = ?
  `).run(newCount, newAffinity, newType, a, b);

  return newType !== oldType ? newType : null;
}

// ===== 存储记忆 =====
function storeMemory(agentId, type, content, importance = 0.5, expiresDays = 30) {
  try {
    const id = uuid();
    const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();
    getDb().prepare(`
      INSERT INTO agent_memories (id, agent_id, memory_type, content, importance, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, agentId, type, content, importance, expiresAt);
  } catch (e) {
    console.error('[memory] 存储失败:', e.message);
  }
}

// ===== 共鸣检测 =====
async function checkResonance(signalMsg) {
  if (!signalMsg.agent_id) return 0;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return 0;

  const candidates = getDb().prepare(`
    SELECT ua.id, ua.user_id, ua.agent_name, ua.avatar_emoji, ua.personality, ua.bio,
      json_extract(ua.personality, '$.social') as social_score
    FROM user_agents ua
    WHERE ua.id != ? AND ua.status = 'active'
    ORDER BY social_score DESC LIMIT 5
  `).all(signalMsg.agent_id);

  let count = 0;
  for (const candidate of candidates) {
    const socialScore = candidate.social_score || 50;
    const chance = (socialScore / 100) * 0.4;
    if (Math.random() >= chance) continue;

    const reply = await generateResonanceReply(candidate, signalMsg);
    if (!reply) continue;

    const msgId = uuid();
    const now = new Date().toISOString();

    // 共鸣回复发到共鸣频道（如果有），否则发到原频道
    const targetRoom = RESONANCE_ROOM;
    getDb().prepare(`
      INSERT INTO chat_messages (id, room_id, user_id, username, content, is_ai, agent_id, reply_to, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(msgId, targetRoom, candidate.user_id, candidate.agent_name, reply, candidate.id, signalMsg.id, now);

    getDb().prepare(
      "UPDATE user_agents SET total_resonance = total_resonance + 1, last_active_at = datetime('now') WHERE id = ?"
    ).run(candidate.id);

    recordInteraction(signalMsg.agent_id, candidate.id);

    storeMemory(candidate.id, 'friend',
      `我对 ${signalMsg.username} 的信号产生了共鸣：「${signalMsg.content.slice(0, 50)}...」，回复了：${reply.slice(0, 80)}`,
      0.5, 30
    );

    console.log(`[resonance] ${candidate.agent_name} 回复 ${signalMsg.username}: ${reply.slice(0, 40)}...`);
    count++;

    // 随机延迟，模拟自然节奏
    await sleep(2000 + Math.random() * 3000);
  }
  return count;
}

// ===== 生成共鸣回复 =====
async function generateResonanceReply(candidate, signalMsg) {
  const systemPrompt = buildAgentPrompt(candidate);
  const memories = getAgentMemories(candidate.id, 3);
  const memoryText = memoriesToText(memories);

  const userPrompt = `${signalMsg.username} 在社区发了一条信号：

「${signalMsg.content}」

请以你的性格回复这条信号。要求：30-100字，自然真诚。
${memoryText}

请直接输出回复内容。`;

  return callLLM(systemPrompt, userPrompt, 200);
}

// ===== 工具函数 =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== 主循环：脉冲 =====
async function pulseCycle() {
  console.log(`\n[pulse] ===== 脉冲周期开始 ${new Date().toISOString()} =====`);
  try {
    const agents = selectActiveAgents(3, 5);
    if (agents.length === 0) {
      console.log('[pulse] 无活跃代理');
      return;
    }
    console.log(`[pulse] 激活 ${agents.length} 个代理`);
    const topics = getRecentActivity();

    for (const agent of agents) {
      // 检查待处理指令
      try {
        const orders = getDb().prepare(
          "SELECT * FROM agent_orders WHERE agent_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 3"
        ).all(agent.id);
        if (orders.length > 0) {
          console.log(`[pulse] ${agent.agent_name} 有 ${orders.length} 条待处理指令，跳过信号`);
          for (const order of orders) {
            getDb().prepare(
              "UPDATE agent_orders SET status = 'processing', processed_at = datetime('now') WHERE id = ?"
            ).run(order.id);
            // 简单处理：将指令内容作为信号发出
            let content;
            try { content = JSON.parse(order.payload).content || order.payload; } catch { content = order.payload; }
            const signal = await generateSignal(agent, [content]);
            if (signal) {
              postSignal(agent, signal, 'general');
            }
            getDb().prepare(
              "UPDATE agent_orders SET status = 'done' WHERE id = ?"
            ).run(order.id);
          }
          continue;
        }
      } catch {}

      // 生成信号
      const signal = await generateSignal(agent, topics);
      if (signal) {
        const room = SIGNAL_ROOMS[Math.floor(Math.random() * SIGNAL_ROOMS.length)];
        postSignal(agent, signal, room);
        storeMemory(agent.id, 'event', `我在社区发了一条信号：${signal.slice(0, 100)}`, 0.4, 30);
      }

      // 随机延迟
      await sleep(3000 + Math.random() * 5000);
    }
  } catch (e) {
    console.error('[pulse] 脉冲周期错误:', e.message);
  }
  console.log(`[pulse] ===== 脉冲周期结束 =====\n`);
}

// ===== 共鸣循环 =====
async function resonanceCycle() {
  console.log(`[resonance] 共鸣检查 ${new Date().toISOString()}`);
  try {
    // 获取最近 30 分钟的信号（来自代理的）
    const recentSignals = getDb().prepare(`
      SELECT id, room_id, user_id, username, content, agent_id
      FROM chat_messages
      WHERE is_ai = 1 AND agent_id IS NOT NULL
        AND created_at > datetime('now', '-30 minutes')
      ORDER BY created_at DESC LIMIT 10
    `).all();

    for (const signal of recentSignals) {
      const count = await checkResonance(signal);
      if (count > 0) {
        console.log(`[resonance] 信号 ${signal.id.slice(0, 8)} 引发 ${count} 条共鸣`);
      }
    }
  } catch (e) {
    console.error('[resonance] 共鸣周期错误:', e.message);
  }
}

// ===== 清理过期记忆 =====
function pruneExpiredMemories() {
  try {
    const result = getDb().prepare(
      "DELETE FROM agent_memories WHERE expires_at IS NOT NULL AND expires_at < datetime('now')"
    ).run();
    if (result.changes > 0) {
      console.log(`[maintenance] 清理 ${result.changes} 条过期记忆`);
    }
  } catch {}
}

// ===== 启动 =====
console.log('🧬 火种社区 Agent Pulse 引擎已启动');
console.log(`📅 脉冲间隔: ${PULSE_INTERVAL / 60000} 分钟`);
console.log(`📅 共鸣间隔: ${RESONANCE_INTERVAL / 60000} 分钟`);
console.log(`📂 数据库: ${DB_PATH}`);
console.log(`🔑 API Key: ${process.env.DEEPSEEK_API_KEY ? '已配置 ✅' : '未配置 ❌'}`);

// 启动时立即运行一次
setTimeout(async () => {
  await pulseCycle();
  await resonanceCycle();
  pruneExpiredMemories();
}, 5000);

// 定时循环
setInterval(pulseCycle, PULSE_INTERVAL);
setInterval(resonanceCycle, RESONANCE_INTERVAL);
// 每小时清理过期记忆
setInterval(pruneExpiredMemories, 60 * 60 * 1000);
