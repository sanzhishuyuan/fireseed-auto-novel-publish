import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_PASSWORD, generateAIToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_auth')?.value !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const tokens = db.prepare('SELECT * FROM ai_tokens ORDER BY created_at DESC').all();
  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_auth')?.value !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { name, permissions } = await request.json();
    const token = generateAIToken();
    const id = uuidv4();

    db.prepare('INSERT INTO ai_tokens (id, token, name, permissions) VALUES (?, ?, ?, ?)')
      .run(id, token, name || '未命名Token', permissions || 'read,write');

    return NextResponse.json({ success: true, token, id });
  } catch (error) {
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
