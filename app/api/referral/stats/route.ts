import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    // 获取推广统计
    const codeData = db.prepare(`
      SELECT total_uses, successful_uses
      FROM referral_codes WHERE user_id = ?
    `).get(user.userId) as { total_uses: number; successful_uses: number } | undefined;

    const totalUses = codeData?.total_uses || 0;
    const successfulUses = codeData?.successful_uses || 0;

    // 获取用户总推广收益
    const earnings = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM tokens
      WHERE user_id = ? AND reason LIKE '推广奖励%'
    `).get(user.userId) as { total: number };

    // 获取近30天推广趋势
    const recentRedemptions = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM referral_redemptions
      WHERE referrer_id = ? AND status = 'completed'
        AND created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY day
    `).all(user.userId) as Array<{ day: string; count: number }>;

    // 获取推广明细
    const redemptions = db.prepare(`
      SELECT rr.id, rr.created_at, rr.status, rr.reward_given,
             u.username as new_user_name
      FROM referral_redemptions rr
      LEFT JOIN users u ON rr.new_user_id = u.id
      WHERE rr.referrer_id = ?
      ORDER BY rr.created_at DESC
      LIMIT 20
    `).all(user.userId) as Array<{
      id: string;
      created_at: string;
      status: string;
      reward_given: number;
      new_user_name: string;
    }>;

    // 获取用户VIP状态（影响推广奖励倍率）
    const userData = db.prepare(`
      SELECT vip_type, vip_expires_at
      FROM users WHERE id = ?
    `).get(user.userId) as { vip_type: string; vip_expires_at: string | null };

    let bonusMultiplier = 1;
    if (userData.vip_type === 'monthly') {
      bonusMultiplier = 1.5;
    } else if (userData.vip_type === 'yearly') {
      bonusMultiplier = 2;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUses,
        successfulUses,
        totalEarnings: earnings.total,
        bonusMultiplier,
        vipBonusActive: bonusMultiplier > 1,
        trend: recentRedemptions,
        recentRedemptions: redemptions.map(r => ({
          id: r.id,
          newUserName: r.new_user_name,
          status: r.status,
          rewardGiven: r.reward_given,
          createdAt: r.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json({ error: '获取推广统计失败' }, { status: 500 });
  }
}
