import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

// 获取/生成用户的推广码
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  // 查找用户已有的推广码
  let code = db.prepare(`
    SELECT id, code, total_uses, successful_uses, is_active, created_at
    FROM referral_codes
    WHERE user_id = ?
  `).get(ctx.user.id) as {
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
    `).run(codeId, ctx.user.id, newCode);

    // 更新用户表的推广码
    db.prepare(`UPDATE users SET referral_code = ? WHERE id = ?`).run(newCode, ctx.user.id);

    code = {
      id: codeId,
      code: newCode,
      total_uses: 0,
      successful_uses: 0,
      is_active: 1,
      created_at: new Date().toISOString()
    };
  }

  return apiSuccess({
    code: code.code,
    totalUses: code.total_uses,
    successfulUses: code.successful_uses,
    isActive: code.is_active === 1,
    shareUrl: `https://fireseed.online/auth/register?ref=${code.code}`,
    createdAt: code.created_at
  });
});

// 外部查询推广码信息（注册时用）
export const POST = withRoute({ auth: 'none', body: true }, async (request, ctx) => {
  const { code } = ctx.body;

  if (!code) {
    return apiError('VALIDATION_REQUIRED', '推广码不能为空', 400);
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
    return apiError('NOT_FOUND', '无效的推广码', 404);
  }

  return apiSuccess({
    code: referral.code,
    referrerName: referral.nickname || referral.username,
    isValid: true
  });
});

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
