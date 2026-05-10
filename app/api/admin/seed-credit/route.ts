import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { transferSeed } from '@/lib/seed';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/seed-credit
 * 管理员为指定用户充值 SEED
 * body: { user_id: string, amount: number, reason?: string }
 */
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request, 'admin.manage');
  if (admin instanceof Response) return admin;

  try {
    const body = await request.json().catch(() => ({}));
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
    const balance = transferSeed(user_id, amount, 'seed_in', {
      description: reason ? `管理员充值: ${reason}` : `管理员充值 ${amount} 🌱`,
    });

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
