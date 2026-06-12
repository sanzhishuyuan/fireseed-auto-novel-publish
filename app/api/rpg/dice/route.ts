/**
 * POST /api/rpg/dice — 掷骰子
 */
import { NextRequest, NextResponse } from 'next/server';
import { rollDice, formatDiceResult } from '@/lib/rpg/dice';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expression, note } = body;

    if (!expression || typeof expression !== 'string') {
      return NextResponse.json({ success: false, error: '请提供骰子表达式' }, { status: 400 });
    }

    const result = rollDice(expression.trim());
    const formatted = formatDiceResult(result);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        note: note || '',
        formatted,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '掷骰失败';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
