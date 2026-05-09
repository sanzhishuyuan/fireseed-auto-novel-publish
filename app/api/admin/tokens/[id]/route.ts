import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import db from '@/lib/db';
import { safeParseJSON } from '@/lib/request-parser';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
    const { id } = await params;
  const cookieStore = await cookies();
  const admin = requireAdmin(request, 'token.manage');
  if (admin instanceof Response) return admin;
  }

  try {
    // 修复: request.json() 解析异常兼容
    const bodyText = await request.text();
      const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { is_active } = parsed.data;
    db.prepare('UPDATE ai_tokens SET is_active = ? WHERE id = ?').run(is_active, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
    const { id } = await params;
  const cookieStore = await cookies();
  const admin = requireAdmin(request, 'token.manage');
  if (admin instanceof Response) return admin;
  }

  try {
    db.prepare('DELETE FROM ai_tokens WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
