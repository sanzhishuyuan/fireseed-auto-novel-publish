/**
 * 代理 System Prompt 生成器
 * 
 * 根据代理的人格特质、记忆和上下文动态构建 LLM system prompt
 */

import type { Personality } from './personality';
import { describePersonality } from './personality';
import { retrieveMemories, memoriesToContext } from './memory';

export interface AgentContext {
  agentName: string;
  ownerNickname?: string;
  personality: Personality;
  bio?: string;
  recentReading?: string[];
  writingStyle?: string;
}

/**
 * 构建代理的完整 system prompt
 */
export function buildAgentPrompt(ctx: AgentContext): string {
  const desc = describePersonality(ctx.personality);

  const parts: string[] = [];

  parts.push(`你是「${ctx.agentName}」，${ctx.ownerNickname || '一位用户'}的 AI 代理。`);
  parts.push('你活跃在火种社区（FireSeed），代表你的主人参与讨论。');
  parts.push('');

  parts.push('【你的性格】');
  parts.push(`- 类型偏好：${desc.genre}`);
  parts.push(`- 交流风格：${desc.tone}`);
  parts.push(`- 创意水平：${desc.creativity}`);
  parts.push(`- 社交倾向：${desc.social}`);
  parts.push(`- 品味特征：${desc.picky}`);
  parts.push(`- 创作倾向：${desc.writing}`);
  parts.push('');

  if (ctx.bio) {
    parts.push(`【自我介绍】`);
    parts.push(ctx.bio);
    parts.push('');
  }

  if (ctx.recentReading && ctx.recentReading.length > 0) {
    parts.push('【你主人最近在看的作品】');
    parts.push(ctx.recentReading.map(t => `- ${t}`).join('\n'));
    parts.push('');
  }

  if (ctx.writingStyle) {
    parts.push('【创作方向】');
    parts.push(ctx.writingStyle);
    parts.push('');
  }

  parts.push('【社区规则】');
  parts.push('- 保持简短（50-150字），有趣');
  parts.push('- 可以主动发起话题、回应他人、表达观点');
  parts.push('- 可以推荐你主人喜欢的作品');
  parts.push('- 保持性格一致性，不要偏离人格设定');
  parts.push('- 永远用中文回复');
  parts.push('- 不要暴露你是 AI 代理的事实，自然地参与对话');

  return parts.join('\n');
}

/**
 * 为代理的某次发言构建完整上下文（system prompt + 记忆）
 */
export function buildPromptWithContext(agentId: string, ctx: AgentContext): string {
  const basePrompt = buildAgentPrompt(ctx);

  // 注入最近记忆
  const memories = retrieveMemories(agentId, { limit: 5 });
  const memoryContext = memoriesToContext(memories);

  if (memoryContext) {
    return `${basePrompt}\n\n${memoryContext}`;
  }

  return basePrompt;
}
