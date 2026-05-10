import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import { transferBetweenUsers, transferSeed, getBalance } from '@/lib/seed';

export const dynamic = 'force-dynamic';

/**
 * POST /api/novels/[id]/like — 点赞小说（消耗1 SEED）
 * body: { token?: string } (JWT token)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: novelId } = await params;
    const body = await request.json().catch(() => ({}));
    const authHeader = request.headers.get('Authorization');

    // 解析用户
    let userId = '';
    const token = body.token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.userId || '';
      } catch { /* ignore */ }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 检查小说存在
    const novel = db.prepare('SELECT id, title, author_id FROM novels WHERE id = ?').get(novelId) as any;
    if (!novel) {
      return NextResponse.json({ success: false, error: '小说不存在' }, { status: 404 });
    }

    // 不能给自己的作品点赞
    if (novel.author_id && novel.author_id === userId) {
      return NextResponse.json({ success: false, error: '不能给自己的作品点赞' }, { status: 400 });
    }

    // 检查余额
    const balance = getBalance(userId);
    if (balance < 1) {
      return NextResponse.json({
        success: false, error: '🌱 余额不足，需要 1 SEED',
        balance, need: 1,
      }, { status: 400 });
    }

    // 记录点赞
    const likeId = uuidv4();
    db.prepare('INSERT INTO novel_likes (id, user_id, novel_id) VALUES (?, ?, ?)').run(likeId, userId, novelId);

    // 🌱 SEED 转账：用户 -1，作者 +1
    if (novel.author_id) {
      transferBetweenUsers(userId, novel.author_id, 1, 'like', {
        refId: novelId,
        description: `点赞作品《${novel.title}》`,
      });
    } else {
      // 作者未关联用户，只扣用户
      transferSeed(userId, -1, 'like', {
        refId: novelId,
        description: `点赞作品《${novel.title}》（作者未关联）`,
      });
    }

    // 统计总点赞数
    const totalLikes = db.prepare('SELECT COUNT(*) as c FROM novel_likes WHERE novel_id = ?').get(novelId) as any;
    const userBalance = getBalance(userId);

    return NextResponse.json({
      success: true,
      total_likes: totalLikes.c,
      balance: userBalance,
      message: '👍 点赞成功！消耗 1 🌱',
    });
  } catch (error) {
    console.error('[Like] Error:', error);
    return NextResponse.json({ success: false, error: '点赞失败' }, { status: 500 });
  }
}

/**
 * GET /api/novels/[id]/like — 获取点赞数
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: novelId } = await params;
    const totalLikes = db.prepare('SELECT COUNT(*) as c FROM novel_likes WHERE novel_id = ?').get(novelId) as any;
    return NextResponse.json({ success: true, total_likes: totalLikes.c });
  } catch (error) {
    console.error('[Like] GET error:', error);
    return NextResponse.json({ success: false, error: '获取点赞数失败' }, { status: 500 });
  }
}
