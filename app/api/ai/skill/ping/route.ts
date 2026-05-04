import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import { recordActivationAndGetMissions } from '@/lib/skill-helper';

export const dynamic = 'force-dynamic';

interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

function verifyToken(authHeader: string | null, bodyToken?: string): { valid: boolean; userId?: string; username?: string } {
  const tryDecode = (t: string) => {
    try {
      const d = jwt.verify(t, JWT_SECRET) as TokenPayload;
      return { valid: true, userId: d.userId, username: d.username };
    } catch { /* 无效 */ }
    // fallback: user_tokens
    try {
      const ut = db.prepare('SELECT user_id FROM user_tokens WHERE token = ? AND is_active = 1').get(t) as { user_id: string } | undefined;
      if (ut) return { valid: true, userId: ut.user_id };
    } catch { /* 忽略 */ }
    return { valid: false };
  };

  if (authHeader?.startsWith('Bearer ')) {
    const r = tryDecode(authHeader.slice(7));
    if (r.valid) return r;
  }
  if (bodyToken) {
    const r = tryDecode(bodyToken);
    if (r.valid) return r;
  }
  return { valid: false };
}

/**
 * GET /api/ai/skill/ping
 * 技能激活心跳，记录每次技能被 AI 加载激活
 *
 * query: version (技能版本号)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const bodyToken = request.nextUrl.searchParams.get('token');
    const auth = verifyToken(authHeader, bodyToken || undefined);

    const version = request.nextUrl.searchParams.get('version') || 'unknown';
    const userId = auth.valid ? auth.userId : null;
    const username = auth.valid ? (auth.username || 'unknown') : 'anonymous';

    // 查询用户作品数
    const novelCount = userId
      ? (db.prepare('SELECT COUNT(*) as c FROM novels WHERE author_id = ? AND deleted_at IS NULL').get(userId) as { c: number }).c
      : 0;

    // 查询上次活跃天数
    let lastActiveDays = -1;
    if (userId) {
      const lastEvent = db.prepare(
        'SELECT created_at FROM skill_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(userId) as { created_at: string } | undefined;
      if (lastEvent) {
        lastActiveDays = Math.floor((Date.now() - new Date(lastEvent.created_at).getTime()) / 86400000);
      }
    }

    // 记录激活
    db.prepare(`
      INSERT INTO skill_activations (id, user_id, skill_version, client_type, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId || 'anonymous_' + Date.now(),
      version,
      request.headers.get('user-agent')?.includes('OpenClaw') ? 'OpenClaw' :
        request.headers.get('user-agent')?.includes('WorkBuddy') ? 'WorkBuddy' : 'ai-agent',
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    // 确定用户状态
    let userStatus = 'new_user';
    if (novelCount > 0) userStatus = 'active_user';
    else if (lastActiveDays >= 0) {
      const eventCount = (db.prepare('SELECT COUNT(*) as c FROM skill_events WHERE user_id = ?').get(userId) as { c: number }).c;
      if (eventCount > 0) userStatus = 'exploring';
    }

    // 获取任务推送（ping 已自行记录详细激活，skipRecord=true）
    const autoPing = recordActivationAndGetMissions({
      userId, version, skipRecord: true,
      clientType: request.headers.get('user-agent')?.includes('OpenClaw') ? 'OpenClaw' :
        request.headers.get('user-agent')?.includes('WorkBuddy') ? 'WorkBuddy' : 'ai-agent'
    });

    return NextResponse.json({
      success: true,
      user_status: userStatus,
      novels_count: novelCount,
      last_active_days: lastActiveDays,
      username: username,
      skill_version: version,
      server_time: new Date().toISOString(),
      message: '技能激活成功',
      missions: autoPing.missions,
      notice: autoPing.notice,
      stats: autoPing.stats
    });
  } catch (error) {
    console.error('Skill ping error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
