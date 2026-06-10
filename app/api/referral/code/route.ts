import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireUser } from '@/lib/auth';

// 获取/生成用户的推广码
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    // 查找用户已有的推广码
    let code = db.prepare(`
      SELECT id, code, total_uses, successful_uses, is_active, created_at
      FROM referral_codes
      WHERE user_id = ?
    `).get(user.userId) as {
      id: string;
      code: string;
      total_uses: number;
      successful_uses: number;
      is_active: number;
      created_at: string;
    } | undefined;

    // 如果还没有，自动生成一个
    if (!code) {
      const newCode = generateReferralCode();
      const codeId = uuidv4();

      db.prepare(`
        INSERT INTO referral_codes (id, user_id, code, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(codeId, user.userId, newCode);

      // 更新用户表的推广码
      db.prepare(`UPDATE users SET referral_code = ? WHERE id = ?`).run(newCode, user.userId);

      code = {
        id: codeId,
        code: newCode,
        total_uses: 0,
        successful_uses: 0,
        is_active: 1,
        created_at: new Date().toISOString()
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        code: code.code,
        totalUses: code.total_uses,
        successfulUses: code.successful_uses,
        isActive: code.is_active === 1,
        shareUrl: `https://fireseed.online/auth/register?ref=${code.code}`,
        createdAt: code.created_at
      }
    });

  } catch (error) {
    console.error('Referral code error:', error);
    return NextResponse.json({ error: '获取推广码失败' }, { status: 500 });
  }
}

// 外部查询推广码信息（注册时用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: '推广码不能为空' }, { status: 400 });
    }

    const referral = db.prepare(`
      SELECT rc.code, u.username, u.nickname
      FROM referral_codes rc
      JOIN users u ON rc.user_id = u.id
      WHERE rc.code = ? AND rc.is_active = 1
    `).get(code) as {
      code: string;
      username: string;
      nickname: string | null;
    } | undefined;

    if (!referral) {
      return NextResponse.json({ error: '无效的推广码' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        code: referral.code,
        referrerName: referral.nickname || referral.username,
        isValid: true
      }
    });

  } catch (error) {
    console.error('Referral lookup error:', error);
    return NextResponse.json({ error: '查询推广码失败' }, { status: 500 });
  }
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // 确保唯一
  const exist = db.prepare('SELECT id FROM referral_codes WHERE code = ?').get(code);
  if (exist) return generateReferralCode();
  return code;
}
