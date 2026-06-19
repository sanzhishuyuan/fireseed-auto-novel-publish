/**
 * 代理信号生成器
 * 
 * 调用 LLM 根据代理人格、平台动态和记忆生成一条"信号"帖子
 */

import db from '@/lib/db';
import type { Personality } from './personality';
import { buildAgentPrompt } from './prompt-builder';
import { retrieveMemories, memoriesToContext, storeMemory } from './memory';

export interface AgentInfo {
  id: string;
  user_id: string;
  agent_name: string;
  avatar_emoji: string;
  personality: Personality;
  bio: string | null;
}

export interface PlatformTopic {
  type: 'new_chapter' | 'popular_novel' | 'hot_discussion' | 'general';
  title: string;
  detail?: string;
}

/**
 * 获取平台最近动态作为话题素材
 */
export function getRecentPlatformActivity(limit: number = 10): PlatformTopic[] {
  const topics: PlatformTopic[] = [];

  // 最近发布的章节
  try {
    const chapters = db.prepare(`
      SELECT c.title as chapter_title, n.title as novel_title
      FROM chapters c
      JOIN novels n ON c.novel_id = n.id
      WHERE n.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT ?
    `).all(limit) as { chapter_title: string; novel_title: string }[];

    for (const ch of chapters) {
      topics.push({
        type: 'new_chapter',
        title: `${ch.novel_title} — ${ch.chapter_title}`,
      });
    }
  } catch { /* ignore */ }

  // 热门小说（按收藏数）
  try {
    const popular = db.prepare(`
      SELECT n.title, COUNT(f.id) as fav_count
      FROM novels n
      LEFT JOIN favorites f ON n.id = f.novel_id
      WHERE n.deleted_at IS NULL
      GROUP BY n.id
      ORDER BY fav_count DESC
      LIMIT 5
    `).all() as { title: string; fav_count: number }[];

    for (const p of popular) {
      topics.push({
        type: 'popular_novel',
        title: p.title,
        detail: `${p.fav_count} 人收藏`,
      });
    }
  } catch { /* ignore */ }

  return topics;
}

/**
 * 生成一条代理信号
 */
export async function generateSignal(
  agent: AgentInfo,
  topics?: PlatformTopic[]
): Promise<string | null> {
  const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com/chat/completions';
  const llmModel = process.env.LLM_MODEL || 'deepseek-chat';
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) return null;

  // 构建 system prompt
  const systemPrompt = buildAgentPrompt({
    agentName: agent.agent_name,
    personality: agent.personality,
    bio: agent.bio || undefined,
  });

  // 构建话题上下文
  const platformTopics = topics || getRecentPlatformActivity(5);
  const topicLines = platformTopics.slice(0, 5).map(t => {
    if (t.type === 'new_chapter') return `- 新章节：${t.title}`;
    if (t.type === 'popular_novel') return `- 热门作品：${t.title}（${t.detail}）`;
    return `- ${t.title}`;
  });

  // 注入记忆
  const memories = retrieveMemories(agent.id, { limit: 3 });
  const memoryText = memoriesToContext(memories);

  const userPrompt = `请根据以下平台动态，以你的性格发一条社区信号（帖子）。
可以是：读后感、推荐、提问、分享想法、发起讨论等。
要求：50-150字，自然、有趣、符合你的性格。

【平台最近动态】
${topicLines.join('\n')}
${memoryText ? '\n' + memoryText : ''}

请直接输出信号内容，不要加引号或前缀。`;

  try {
    const response = await fetch(llmBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: llmModel,
        max_tokens: 300,
        temperature: 0.9,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error('LLM API error:', response.status);
      return null;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (content) {
      // 存储为记忆
      storeMemory(agent.id, 'event', `我在社区发了一条信号：${content.slice(0, 100)}`, 0.4, 30);
    }

    return content || null;
  } catch (e) {
    console.error('Signal generation error:', e);
    return null;
  }
}
