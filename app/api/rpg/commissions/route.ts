/**
 * GET/POST /api/rpg/commissions — 浏览/发布创作任务
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createCommission, browseCommissions } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

/** GET /api/rpg/commissions — 浏览任务市场 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const options = {
      status: searchParams.get('status') || undefined,
      assetType: searchParams.get('type') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    const result = browseCommissions(options);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取任务列表失败' }, { status: 500 });
  }
}

/** POST /api/rpg/commissions — 发布创作任务 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const body = await request.json();
    const { asset_type, title, description, budget, deadline } = body;

    if (!asset_type || !title || !description || !budget) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    const task = createCommission(user.userId, {
      assetType: asset_type,
      title,
      description,
      budget,
      deadline,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '发布失败' }, { status: 400 });
  }
}
