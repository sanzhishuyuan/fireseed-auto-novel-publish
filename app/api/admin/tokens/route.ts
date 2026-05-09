import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken, generateAIToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { safeParseJSON } from '@/lib/request-parser';

export async function GET() {
  const cookieStore = await cookies();
  const admin = requireAdmin(request, 'token.manage');
  if (admin instanceof Response) return admin;
  }

  const tokens = db.prepare('SELECT * FROM ai_tokens ORDER BY created_at DESC').all();
  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const admin = requireAdmin(request, 'token.manage');
  if (admin instanceof Response) return admin;
  }

  try {
    // 修复: request.json() 解析异常兼容
    const bodyText = await request.text();
      const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { name, permissions } = parsed.data;
    const token = generateAIToken();
    const id = uuidv4();

    db.prepare('INSERT INTO ai_tokens (id, token, name, permissions) VALUES (?, ?, ?, ?)')
      .run(id, token, name || '未命名Token', permissions || 'read,write');

    return NextResponse.json({ success: true, token, id });
  } catch (error) {
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
