import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_PASSWORD } from '@/lib/auth';
import db from '@/lib/db';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  if (cookieStore.get('admin_auth')?.value !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { is_active } = await request.json();
    db.prepare('UPDATE ai_tokens SET is_active = ? WHERE id = ?').run(is_active, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  if (cookieStore.get('admin_auth')?.value !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    db.prepare('DELETE FROM ai_tokens WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
