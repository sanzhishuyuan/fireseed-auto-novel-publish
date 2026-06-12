/**
 * PATCH /api/rpg/commissions/:id — 任务状态变更
 * action: assign / submit / approve / dispute / cancel
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import {
  assignCommission, submitCommission, approveCommission,
  disputeCommission, cancelCommission,
} from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: '缺少 action 参数' }, { status: 400 });
    }

    switch (action) {
      case 'assign':
        assignCommission(id, user.userId);
        break;
      case 'submit':
        if (!body.delivery_asset_id) {
          return NextResponse.json({ success: false, error: '缺少交付资产 ID' }, { status: 400 });
        }
        submitCommission(id, user.userId, body.delivery_asset_id);
        break;
      case 'approve':
        approveCommission(id, user.userId);
        break;
      case 'dispute':
        disputeCommission(id, user.userId);
        break;
      case 'cancel':
        cancelCommission(id, user.userId);
        break;
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '操作失败' }, { status: 400 });
  }
}
