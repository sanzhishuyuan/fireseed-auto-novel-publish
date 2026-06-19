import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { computePersonality } from '@/lib/agent/personality';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/profile — 获取当前用户的代理信息
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const agent = db.prepare(`
      SELECT ua.*, u.nickname, u.username
      FROM user_agents ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.user_id = ?
    `).get(user.userId) as any;

    if (!agent) {
      return NextResponse.json({ success: false, error: '你还没有 AI 代理' }, { status: 404 });
    }

    // 解析 personality JSON
    try { agent.personality = JSON.parse(agent.personality); } catch {}

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error('Get agent profile error:', error);
    return NextResponse.json({ success: false, error: '获取代理信息失败' }, { status: 500 });
  }
}

/**
 * PUT /api/agent/profile — 更新当前用户的代理设置
 * Body: { agent_name?, avatar_emoji?, personality?, bio?, status? }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const agent = db.prepare('SELECT id FROM user_agents WHERE user_id = ?').get(user.userId) as { id: string } | undefined;

    if (!agent) {
      return NextResponse.json({ success: false, error: '你还没有 AI 代理' }, { status: 404 });
    }

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];

    if (body.agent_name && typeof body.agent_name === 'string' && body.agent_name.trim().length >= 1 && body.agent_name.trim().length <= 30) {
      updates.push('agent_name = ?');
      values.push(body.agent_name.trim());
    }

    if (body.avatar_emoji && typeof body.avatar_emoji === 'string') {
      updates.push('avatar_emoji = ?');
      values.push(body.avatar_emoji);
    }

    if (body.personality && typeof body.personality === 'object') {
      // 验证 6 维度都在 0-100 范围
      const p = body.personality;
      const keys = ['genre_pref', 'writing_focus', 'tone', 'creativity', 'social', 'picky'];
      const valid = keys.every(k => typeof p[k] === 'number' && p[k] >= 0 && p[k] <= 100);
      if (valid) {
        updates.push('personality = ?');
        values.push(JSON.stringify(p));
      }
    }

    if (body.bio !== undefined && typeof body.bio === 'string') {
      updates.push('bio = ?');
      values.push(body.bio.slice(0, 500));
    }

    if (body.status && ['active', 'dormant', 'hibernating'].includes(body.status)) {
      updates.push('status = ?');
      values.push(body.status);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: '没有需要更新的字段' }, { status: 400 });
    }

    values.push(user.userId);
    db.prepare(`UPDATE user_agents SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);

    // 如果更新了 personality，重新计算 system prompt
    if (body.personality) {
      try {
        const { buildAgentPrompt } = await import('@/lib/agent/prompt-builder');
        const fullAgent = db.prepare('SELECT * FROM user_agents WHERE user_id = ?').get(user.userId) as any;
        const personality = typeof fullAgent.personality === 'string' ? JSON.parse(fullAgent.personality) : fullAgent.personality;
        const prompt = buildAgentPrompt({
          agentName: fullAgent.agent_name,
          ownerNickname: user.nickname || user.username,
          personality,
          bio: fullAgent.bio || undefined,
        });
        db.prepare('UPDATE user_agents SET system_prompt = ? WHERE user_id = ?').run(prompt, user.userId);
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update agent profile error:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

/**
 * POST /api/agent/profile — 重新计算人格特质
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const personality = computePersonality(user.userId);
    return NextResponse.json({ success: true, personality });
  } catch (error) {
    console.error('Recompute personality error:', error);
    return NextResponse.json({ success: false, error: '重新计算失败' }, { status: 500 });
  }
}
