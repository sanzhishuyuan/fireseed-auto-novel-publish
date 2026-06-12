/**
 * GET /api/rpg/lorebooks/[id] — 获取世界书详情（含解析后的条目）
 * PUT /api/rpg/lorebooks/[id] — 更新世界书（名称/描述/条目）
 * DELETE /api/rpg/lorebooks/[id] — 删除世界书
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import type { LorebookEntry } from '@/lib/rpg/types';

export const dynamic = 'force-dynamic';

/**
 * GET — 获取世界书详情
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const row = db.prepare('SELECT * FROM rpg_lorebooks WHERE id = ?').get(id) as any;

    if (!row) {
      return NextResponse.json({ success: false, error: '世界书不存在' }, { status: 404 });
    }

    if (row.user_id !== user.userId && !row.is_public) {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 });
    }

    let entries: LorebookEntry[] = [];
    try { entries = JSON.parse(row.entries || '[]'); } catch {}

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        entries,
        entry_count: entries.length,
      },
    });
  } catch (error) {
    console.error('Get lorebook error:', error);
    return NextResponse.json({ success: false, error: '获取世界书失败' }, { status: 500 });
  }
}

/**
 * PUT — 更新世界书
 * Body: { name?, description?, entries?, is_public? }
 * 或条目操作: { action: 'add_entry'|'update_entry'|'remove_entry'|'toggle_entry', entry?: LorebookEntry, entryId?: string }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const row = db.prepare('SELECT * FROM rpg_lorebooks WHERE id = ? AND user_id = ?').get(id, user.userId) as any;

    if (!row) {
      return NextResponse.json({ success: false, error: '世界书不存在或无权修改' }, { status: 404 });
    }

    const body = await request.json();
    let entries: LorebookEntry[] = [];
    try { entries = JSON.parse(row.entries || '[]'); } catch {}

    // 条目级操作
    if (body.action) {
      switch (body.action) {
        case 'add_entry': {
          const newEntry: LorebookEntry = {
            id: uuidv4(),
            keys: body.entry?.keys || [],
            content: body.entry?.content || '',
            enabled: body.entry?.enabled !== false,
            selective: body.entry?.selective || false,
            priority: body.entry?.priority || 10,
            secondary_keys: body.entry?.secondary_keys || [],
            constant: body.entry?.constant || false,
          };
          entries.push(newEntry);
          break;
        }
        case 'update_entry': {
          const idx = entries.findIndex(e => e.id === body.entryId);
          if (idx === -1) {
            return NextResponse.json({ success: false, error: '条目不存在' }, { status: 404 });
          }
          entries[idx] = { ...entries[idx], ...body.entry };
          break;
        }
        case 'remove_entry': {
          entries = entries.filter(e => e.id !== body.entryId);
          break;
        }
        case 'toggle_entry': {
          const entry = entries.find(e => e.id === body.entryId);
          if (entry) entry.enabled = !entry.enabled;
          break;
        }
        default:
          return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
      }
    }

    // 整体更新
    const name = body.name !== undefined ? body.name : row.name;
    const description = body.description !== undefined ? body.description : row.description;
    const isPublic = body.is_public !== undefined ? (body.is_public ? 1 : 0) : row.is_public;
    const finalEntries = body.entries || entries;

    db.prepare(`
      UPDATE rpg_lorebooks
      SET name = ?, description = ?, entries = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, JSON.stringify(finalEntries), isPublic, id);

    return NextResponse.json({
      success: true,
      data: { id, entries: finalEntries },
    });
  } catch (error) {
    console.error('Update lorebook error:', error);
    return NextResponse.json({ success: false, error: '更新世界书失败' }, { status: 500 });
  }
}

/**
 * DELETE — 删除世界书
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const row = db.prepare('SELECT id FROM rpg_lorebooks WHERE id = ? AND user_id = ?').get(id, user.userId);

    if (!row) {
      return NextResponse.json({ success: false, error: '世界书不存在或无权删除' }, { status: 404 });
    }

    // 解除关联战役
    db.prepare('UPDATE rpg_campaigns SET lorebook_id = NULL WHERE lorebook_id = ?').run(id);
    db.prepare('DELETE FROM rpg_lorebooks WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete lorebook error:', error);
    return NextResponse.json({ success: false, error: '删除世界书失败' }, { status: 500 });
  }
}
