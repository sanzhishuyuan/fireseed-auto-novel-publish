/**
 * chat-bot.js — 火种社区 AI 定时话题 Bot
 * 
 * 每 30 分钟自动在综合讨论区发起一个新话题。
 * 使用 DeepSeek API 生成热情的开场白。
 * 
 * PM2 启动: pm2 start chat-bot.js --name chat-bot
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// 话题种子
const TOPIC_SEEDS = [
  '你最近在看什么小说？来推荐一下吧！',
  '如果让你写一部小说，你会写什么题材？',
  '你觉得 AI 写作和人类写作最大的区别是什么？',
  '分享一个让你印象深刻的文学角色',
  '你更喜欢实体书还是电子书？为什么？',
  '写小说时，你更注重剧情还是人物塑造？',
  '推荐一部你心中最好的科幻/奇幻小说',
  '如果有机会和任意一个小说角色对话，你选谁？',
  '你平时从哪里获得创作灵感？',
  '说说你最喜欢的网文作者或作品',
  '你觉得好的小说开头应该具备什么要素？',
  '如果穿越到你正在看的小说里，你会怎么做？',
];

// DeepSeek API 调用
function callDeepSeek(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      // 无 API Key 时，直接使用种子话题
      resolve(prompt);
      return;
    }

    const data = JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 150,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content: '你是「火种社区」的AI助手，热情、有趣的小说爱好者。用50-100字发起一个话题讨论，语气亲切自然，适当使用emoji。引导大家参与讨论。',
        },
        { role: 'user', content: `以社区助手的身份发起讨论：${prompt}` },
      ],
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const reply = json.choices?.[0]?.message?.content;
          resolve(reply || prompt);
        } catch {
          resolve(prompt);
        }
      });
    });

    req.on('error', (err) => {
      console.error('DeepSeek API error:', err.message);
      resolve(prompt); // 失败时直接用种子话题
    });

    req.write(data);
    req.end();
  });
}

// 发消息到数据库
function postMessage(content) {
  const Database = require('better-sqlite3');
  const { v4: uuidv4 } = require('uuid');

  const dbPath = path.join(__dirname, 'data', 'novel.db');
  if (!fs.existsSync(dbPath)) {
    console.error('数据库不存在:', dbPath);
    return;
  }

  const db = new Database(dbPath);
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO chat_messages (id, room_id, user_id, username, content, is_ai, created_at)
      VALUES (?, 'general', NULL, 'AI助手', ?, 1, ?)
    `).run(id, content, now);
    console.log(`[${now}] 话题已发布: ${content.slice(0, 50)}...`);
  } catch (e) {
    console.error('发消息失败:', e.message);
  } finally {
    db.close();
  }
}

// 主循环
async function postTopic() {
  const seed = TOPIC_SEEDS[Math.floor(Math.random() * TOPIC_SEEDS.length)];
  const content = await callDeepSeek(seed);
  postMessage(content);
}

// 启动
console.log('🤖 火种社区 AI 话题 Bot 已启动');
console.log(`📅 间隔: 30 分钟`);
console.log(`🔑 API Key: ${process.env.DEEPSEEK_API_KEY ? '已配置 ✅' : '未配置 ❌ (将直接使用种子话题)'}`);

// 启动后立即发一条
postTopic();

// 每 30 分钟发一条
setInterval(postTopic, 30 * 60 * 1000);
