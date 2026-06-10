import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { recordActivationAndGetMissions } from '@/lib/skill-helper';
import { withRoute } from '@/lib/with-route';
import type { AIContext } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

export const GET = withRoute({ auth: 'ai', optionalAuth: true }, async (request: NextRequest, ctx: AIContext) => {
  try {
    const auth = ctx.ai;

    const version = request.nextUrl.searchParams.get('version') || 'unknown';
    const userId = auth.valid ? auth.userId : null;
    let username = 'anonymous';
    if (userId) {
      const u = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as { username: string } | undefined;
      if (u) username = u.username;
    }

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
});
