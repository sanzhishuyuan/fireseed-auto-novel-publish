import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { safeParseJSON } from '@/lib/request-parser';

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request, 'token.manage');
  if (admin instanceof Response) return admin;

  const tokens = db.prepare('SELECT * FROM ai_tokens ORDER BY created_at DESC').all();
  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request, 'token.manage');
  if (admin instanceof Response) return admin;

  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { name, permissions } = parsed.data;
    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const id = uuidv4();

    db.prepare('INSERT INTO ai_tokens (id, token, name, permissions) VALUES (?, ?, ?, ?)')
      .run(id, token, name || '未命名Token', permissions || 'read,write');

    return NextResponse.json({ success: true, token, id });
  } catch (error) {
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
