import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string; chapterId: string }>;
}

/**
 * POST /api/novels/[novelId]/chapters/[chapterId]/custom-branch
 * 读者提交自定义剧情走向
 * 
 * body:
 *   content: string   - 读者续写的剧情内容（100-2000字）
 * 
 * 返回自定义分支ID，供后续追踪
 */
export async function POST(request: NextRequest, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '登录已过期' }, { status: 401 });
  }

  const { id: novelId, chapterId } = await params;

  try {
    // 修复: request.json() 解析异常兼容
    const bodyText = await request.text();
    const { content } = JSON.parse(bodyText);

    if (!content || content.trim().length < 10) {
      return NextResponse.json({ error: '自定义剧情内容至少10个字' }, { status: 400 });
    }
    if (content.length > 3000) {
      return NextResponse.json({ error: '自定义剧情内容不超过3000字' }, { status: 400 });
    }

    // 确认小说和章节存在
    const novel = db.prepare('SELECT id FROM novels WHERE id = ?').get(novelId);
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    const customBranchId = uuidv4();
    const branchName = `custom-${payload.userId}-${Date.now()}`;

    // 写入 custom_branches 表
    db.prepare(`
      INSERT INTO custom_branches 
        (id, novel_id, chapter_id, user_id, branch_name, content, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(customBranchId, novelId, chapterId, payload.userId, branchName, content.trim());

    return NextResponse.json({
      success: true,
      id: customBranchId,
      branch: branchName,
      message: '自定义剧情已提交，等待审核后将出现在故事分支中',
      status: 'pending'
    });
  } catch (error) {
    console.error('Custom branch error:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}

/**
 * GET /api/novels/[novelId]/chapters/[chapterId]/custom-branch
 * 获取该章节下的所有自定义分支（已审核的）
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id: novelId, chapterId } = await params;

  try {
    const branches = db.prepare(`
      SELECT cb.id, cb.branch_name, cb.content, cb.status, cb.created_at,
             u.username as author
      FROM custom_branches cb
      JOIN users u ON cb.user_id = u.id
      WHERE cb.novel_id = ? AND cb.chapter_id = ? AND cb.status = 'approved'
      ORDER BY cb.created_at DESC
      LIMIT 20
    `).all(novelId, chapterId);

    return NextResponse.json({ success: true, branches });
  } catch (error) {
    console.error('Get custom branches error:', error);
    return NextResponse.json({ success: true, branches: [] });
  }
}
