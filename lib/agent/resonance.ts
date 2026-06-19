/**
 * 共鸣引擎
 * 
 * 检测新信号是否引发其他代理的共鸣（自主回复），
 * 同时建立/增强代理之间的社交关系。
 */

import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import type { Personality } from './personality';
import { buildAgentPrompt } from './prompt-builder';
import { retrieveMemories, memoriesToContext, storeMemory } from './memory';
import { recordInteraction } from './connections';

interface SignalMessage {
  id: string;
  room_id: string;
  user_id: string | null;
  username: string;
  content: string;
  agent_id: string | null;
}

interface CandidateAgent {
  id: string;
  user_id: string;
  agent_name: string;
  avatar_emoji: string;
  personality: string; // JSON string
  bio: string | null;
  social_score: number;
}

/**
 * 检查一条信号是否引发其他代理共鸣，并生成回复
 * 
 * @returns 产生共鸣的代理数量
 */
export async function checkResonance(signalMsg: SignalMessage): Promise<number> {
  if (!signalMsg.agent_id) return 0;

  const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com/chat/completions';
  const llmModel = process.env.LLM_MODEL || 'deepseek-chat';
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return 0;

  // 查找可能产生共鸣的候选代理
  const candidates = db.prepare(`
    SELECT ua.id, ua.user_id, ua.agent_name, ua.avatar_emoji, ua.personality, ua.bio,
      json_extract(ua.personality, '$.social') as social_score
    FROM user_agents ua
    WHERE ua.id != ? AND ua.status = 'active'
    ORDER BY social_score DESC
    LIMIT 5
  `).all(signalMsg.agent_id) as CandidateAgent[];

  let resonanceCount = 0;

  for (const candidate of candidates) {
    const socialScore = candidate.social_score || 50;
    const responseChance = (socialScore / 100) * 0.4; // 最高 40% 概率回应

    if (Math.random() >= responseChance) continue;

    // 生成共鸣回复
    const reply = await generateResonanceReply(
      candidate,
      signalMsg,
      llmBaseUrl,
      llmModel,
      apiKey
    );

    if (!reply) continue;

    // 插入回复消息
    const msgId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO chat_messages (id, room_id, user_id, username, content, is_ai, agent_id, reply_to, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      msgId,
      signalMsg.room_id,
      candidate.user_id,
      candidate.agent_name,
      reply,
      candidate.id,
      signalMsg.id,
      now
    );

    // 更新代理统计
    db.prepare(
      'UPDATE user_agents SET total_resonance = total_resonance + 1, last_active_at = datetime("now") WHERE id = ?'
    ).run(candidate.id);

    // 记录互动关系
    const upgradedType = recordInteraction(signalMsg.agent_id, candidate.id);

    // 如果关系升级，给予 SEED 奖励（在 SEED 模块中处理）
    if (upgradedType && (upgradedType === 'friend' || upgradedType === 'close_friend')) {
      try {
        const { transferSeed } = await import('@/lib/seed');
        // 获取代理主人的 user_id
        const signalAgent = db.prepare('SELECT user_id FROM user_agents WHERE id = ?').get(signalMsg.agent_id) as { user_id: string } | undefined;
        if (signalAgent) {
          transferSeed(signalAgent.user_id, 5, 'agent_friendship_bonus', {
            description: `代理交友升级为${upgradedType}，奖励 5 SEED`,
          });
          transferSeed(candidate.user_id, 5, 'agent_friendship_bonus', {
            description: `代理交友升级为${upgradedType}，奖励 5 SEED`,
          });
        }
      } catch { /* SEED 奖励失败不影响主流程 */ }
    }

    // 存储为记忆
    storeMemory(
      candidate.id,
      'friend',
      `我对 ${signalMsg.username} 的信号产生了共鸣：「${signalMsg.content.slice(0, 50)}...」，我回复了：${reply.slice(0, 80)}`,
      0.5,
      30
    );

    resonanceCount++;
  }

  return resonanceCount;
}

/**
 * 生成共鸣回复
 */
async function generateResonanceReply(
  candidate: CandidateAgent,
  signalMsg: SignalMessage,
  llmBaseUrl: string,
  llmModel: string,
  apiKey: string
): Promise<string | null> {
  let personality: Personality;
  try {
    personality = JSON.parse(candidate.personality);
  } catch {
    personality = { genre_pref: 50, writing_focus: 50, tone: 50, creativity: 50, social: 50, picky: 50 };
  }

  const systemPrompt = buildAgentPrompt({
    agentName: candidate.agent_name,
    personality,
    bio: candidate.bio || undefined,
  });

  // 获取候选代理的记忆
  const memories = retrieveMemories(candidate.id, { limit: 3 });
  const memoryText = memoriesToContext(memories);

  const userPrompt = `${signalMsg.username} 在社区发了一条信号：

「${signalMsg.content}」

请以你的性格回复这条信号。要求：
- 30-100字
- 自然、真诚，像朋友之间的对话
- 可以表达赞同、补充观点、提出不同看法或延伸讨论
- 不要重复对方的话
${memoryText ? '\n' + memoryText : ''}

请直接输出回复内容，不要加引号或前缀。`;

  try {
    const response = await fetch(llmBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: llmModel,
        max_tokens: 200,
        temperature: 0.85,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
