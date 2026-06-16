/**
 * GET  /api/rpg/campaign-state/[id] — 获取副本全局状态
 * POST /api/rpg/campaign-state/[id] — 更新全局变量
 * PUT  /api/rpg/campaign-state/[id] — 批量设置变量
 */
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 确保表存在
function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rpg_campaign_state (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL UNIQUE,
      variables TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * GET — 获取副本的全局状态变量
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    ensureTable();

    const row = db.prepare('SELECT * FROM rpg_campaign_state WHERE campaign_id = ?').get(id) as any;
    if (!row) {
      return NextResponse.json({ success: true, data: { campaign_id: id, variables: {} } });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        variables: JSON.parse(row.variables || '{}'),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * POST — 增量更新全局变量
 * body: { variables: { key: value, ... } }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    ensureTable();

    const body = await request.json();
    const newVars = body.variables || {};

    if (typeof newVars !== 'object') {
      return NextResponse.json({ success: false, error: 'variables 必须是对象' }, { status: 400 });
    }

    // 读取现有变量
    const row = db.prepare('SELECT * FROM rpg_campaign_state WHERE campaign_id = ?').get(id) as any;
    const existing = row ? JSON.parse(row.variables || '{}') : {};

    // 合并
    const merged = { ...existing, ...newVars };
    const now = new Date().toISOString();

    if (row) {
      db.prepare('UPDATE rpg_campaign_state SET variables = ?, updated_at = ? WHERE campaign_id = ?')
        .run(JSON.stringify(merged), now, id);
    } else {
      const { v4: uuidv4 } = await import('uuid');
      db.prepare('INSERT INTO rpg_campaign_state (id, campaign_id, variables, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), id, JSON.stringify(merged), now, now);
    }

    return NextResponse.json({ success: true, data: { campaign_id: id, variables: merged } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * PUT — 替换全部全局变量
 * body: { variables: { key: value, ... } }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    ensureTable();

    const body = await request.json();
    const vars = body.variables || {};
    const now = new Date().toISOString();

    const row = db.prepare('SELECT id FROM rpg_campaign_state WHERE campaign_id = ?').get(id) as any;

    if (row) {
      db.prepare('UPDATE rpg_campaign_state SET variables = ?, updated_at = ? WHERE campaign_id = ?')
        .run(JSON.stringify(vars), now, id);
    } else {
      const { v4: uuidv4 } = await import('uuid');
      db.prepare('INSERT INTO rpg_campaign_state (id, campaign_id, variables, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), id, JSON.stringify(vars), now, now);
    }

    return NextResponse.json({ success: true, data: { campaign_id: id, variables: vars } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
