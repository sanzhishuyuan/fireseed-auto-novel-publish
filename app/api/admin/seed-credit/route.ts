import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireAdmin, ADMIN_PASSWORD } from '@/lib/auth';
import { transferSeed } from '@/lib/seed';
import { safeParseJSON } from '@/lib/request-parser';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/seed-credit
 * 管理员为指定用户充值 SEED
 * body: { user_id: string, amount: number, reason?: string, admin_key?: string }
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const parsed = safeParseJSON(bodyText);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;
  const key = (body.admin_key || '').trim();
  if (!key || key !== ADMIN_PASSWORD) {
    const admin = requireAdmin(request, 'admin.manage');
    if (admin instanceof Response) return admin;
  }

  try {
    const { user_id, username: targetUsername, amount, reason } = body;

    // 支持按 user_id 或 username 查找
    let user: any = null;
    if (user_id) {
      user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(user_id);
    }
    if (!user && targetUsername) {
      user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(targetUsername);
    }

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在，请检查ID或用户名' }, { status: 404 });
    }
    if (!amount || amount <= 0 || !Number.isInteger(Number(amount))) {
      return NextResponse.json({ success: false, error: '请输入正整数金额' }, { status: 400 });
    }

    // 执行充值
    const balance = transferSeed(user.id, Number(amount), 'seed_in', {
      description: reason ? `管理员充值: ${reason}` : `管理员充值 ${amount} 🌱`,
    });

    // 审计日志：记录充值操作
    try {
      let adminId = 'system';
      let adminUsername = 'system';
      const adminCookie = request.cookies.get('admin_token')?.value;
      if (adminCookie) {
        try {
          const jwt = await import('jsonwebtoken');
          const { JWT_SECRET } = await import('@/lib/auth');
          const decoded = jwt.default.verify(adminCookie, JWT_SECRET) as any;
          if (decoded?.userId) { adminId = decoded.userId; adminUsername = decoded.username || 'admin'; }
        } catch {}
      }

      logAdminAction({
        adminId,
        adminUsername,
        action: 'system_setting',
        targetType: 'user',
        targetId: user.id,
        detail: { type: 'seed_credit', amount, reason: reason || '', targetUser: user.username },
        ipAddress: request.headers.get('x-forwarded-for') || '',
      });
    } catch (e) {
      console.warn('审计日志写入失败:', e);
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
      credited: amount,
      balance,
    });
  } catch (error) {
    console.error('[Admin SeedCredit] Error:', error);
    return NextResponse.json({ success: false, error: '充值失败' }, { status: 500 });
  }
}
