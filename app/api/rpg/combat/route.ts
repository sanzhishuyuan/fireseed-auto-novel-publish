/**
 * Combat API — 回合制战斗系统
 *
 * POST /api/rpg/combat — 战斗操作
 *
 * body.mode:
 *   'init'    — 初始化战斗
 *   'turn'    — 执行一个回合
 *   'state'   — 获取当前战斗状态
 *   'end'     — 结束战斗
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { initCombat, executeCombatTurn, getCombatState, endCombat } from '@/lib/rpg/fate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const mode = body.mode || 'init';

    switch (mode) {
      case 'init': {
        const { campaignId, players, enemies } = body;
        if (!campaignId || !players?.length || !enemies?.length) {
          return NextResponse.json({ success: false, error: '缺少 campaignId, players 或 enemies' }, { status: 400 });
        }
        const state = initCombat(campaignId, players, enemies);
        return NextResponse.json({ success: true, data: state });
      }

      case 'turn': {
        const { combatId, action, campaignId } = body;
        if (!combatId || !action) {
          return NextResponse.json({ success: false, error: '缺少 combatId 或 action' }, { status: 400 });
        }
        const result = executeCombatTurn(combatId, action, campaignId);
        if (!result) {
          return NextResponse.json({ success: false, error: '战斗不存在或已结束' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: result });
      }

      case 'state': {
        const { combatId } = body;
        if (!combatId) {
          return NextResponse.json({ success: false, error: '缺少 combatId' }, { status: 400 });
        }
        const state = getCombatState(combatId);
        if (!state) {
          return NextResponse.json({ success: false, error: '战斗不存在' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: state });
      }

      case 'end': {
        const { combatId } = body;
        if (!combatId) {
          return NextResponse.json({ success: false, error: '缺少 combatId' }, { status: 400 });
        }
        const state = endCombat(combatId);
        if (!state) {
          return NextResponse.json({ success: false, error: '战斗不存在' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: state });
      }

      default:
        return NextResponse.json({ success: false, error: `未知 mode: ${mode}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Combat API error:', error);
    return NextResponse.json({ success: false, error: error.message || '战斗系统错误' }, { status: 500 });
  }
}
