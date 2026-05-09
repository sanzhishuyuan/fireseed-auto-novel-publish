import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getAuthUserId(request: NextRequest, bodyToken?: string): string | null {
  const authHeader = request.headers.get('Authorization');
  const tryDecode = (t: string) => {
    try { return (jwt.verify(t, JWT_SECRET) as { userId: string }).userId; } catch { /* 忽略 */ }
    try {
      const ut = db.prepare('SELECT user_id FROM user_tokens WHERE token = ? AND is_active = 1').get(t) as { user_id: string } | undefined;
      if (ut) return ut.user_id;
    } catch { /* 忽略 */ }
    return null;
  };
  if (authHeader?.startsWith('Bearer ')) { const id = tryDecode(authHeader.slice(7)); if (id) return id; }
  if (bodyToken) { const id = tryDecode(bodyToken); if (id) return id; }
  return null;
}

/**
 * POST /api/ai/skill/event
 * 上报用户行为事件（创作完成、章节发布等）
 *
 * body:
 *   token: string (可选，或 Authorization: Bearer)
 *   event_type: string - 事件类型
 *   event_data: object (可选) - 附加数据
 *
 * 事件类型说明:
 *   skill_activate     - 技能被加载
 *   novel_create       - 创建了小说
 *   chapter_publish    - 发布了章节
 *   cover_upload       - 上传了封面
 *   milestone_10       - 达成10章
 *   milestone_50       - 达成50章
 */
export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { token, event_type, event_data } = body;
    const userId = getAuthUserId(request, token);

    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }

    // 记录事件
    const allowedTypes = ['skill_activate', 'novel_create', 'chapter_publish', 'cover_upload', 'milestone_10', 'milestone_50', 'task_take', 'task_complete'];
    const cleanType = allowedTypes.includes(event_type) ? event_type : 'custom_' + event_type;

    db.prepare(`
      INSERT INTO skill_events (id, user_id, event_type, event_data)
      VALUES (?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId || 'anonymous',
      cleanType,
      event_data ? JSON.stringify(event_data) : '{}'
    );

    return NextResponse.json({
      success: true,
      event_type: cleanType,
      recorded: true,
      message: '事件已记录'
    });
  } catch (error) {
    console.error('Skill event error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
