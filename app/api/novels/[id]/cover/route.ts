import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JWT_SECRET, verifyAdminToken } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { safeParseJSON } from '@/lib/request-parser';

const COVERS_DIR = '/var/data/ai-novel/covers';

function ensureCoversDir() {
  if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const novel = db.prepare('SELECT id, author_id FROM novels WHERE id = ?').get(id) as any;
    if (!novel) {
      return NextResponse.json({ success: false, error: 'novel not found' }, { status: 404 });
    }

    const bodyText = await request.text();

    const parsed = safeParseJSON(bodyText);

    if (!parsed.success) return parsed.response;

    const body = parsed.data;
    const { cover_image } = body;

    if (!cover_image) {
      return NextResponse.json({ success: false, error: 'missing cover_image' }, { status: 400 });
    }

    const queryKey = request.nextUrl?.searchParams?.get('admin_key');
    const bodyKey = body.admin_key;
    const token = body.token;
    const authHeader = request.headers.get('Authorization');

    let authed = false;

    // 尝试从 JWT 获取用户信息（支持 token 字段 + Authorization 头）
    const tryDecode = (t: string): { userId: string; role: string } | null => {
      try {
        const d = jwt.verify(t, JWT_SECRET) as any;
        if (d && d.userId) return { userId: d.userId, role: d.role || 'reader' };
      } catch { /* ignore */ }
      return null;
    };
    let tokenInfo = token ? tryDecode(token) : null;
    if (!tokenInfo && authHeader?.startsWith('Bearer ')) {
      tokenInfo = tryDecode(authHeader.slice(7));
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (queryKey && adminPassword && queryKey === adminPassword) authed = true;
    if (bodyKey && adminPassword && bodyKey === adminPassword) authed = true;
    if (!authed && queryKey && verifyAdminToken(queryKey)) authed = true;
    if (!authed && bodyKey && verifyAdminToken(bodyKey)) authed = true;
    // 管理员 JWT：role 为 admin 直接放行
    if (!authed && tokenInfo && tokenInfo.role === 'admin') authed = true;
    // 普通用户 JWT：必须是小说作者本人
    if (!authed && tokenInfo && tokenInfo.userId === novel.author_id) authed = true;

    if (!authed) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 403 });
    }

    let base64Data = cover_image;
    let mimeType = 'image/webp';
    const match = cover_image.match(/^data:(image\/\w+);base64,([\s\S]+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch {
      return NextResponse.json({ success: false, error: 'invalid base64' }, { status: 400 });
    }

    if (buffer.length === 0) {
      return NextResponse.json({ success: false, error: 'empty image' }, { status: 400 });
    }

    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'image too large (max 5MB)' }, { status: 400 });
    }

    ensureCoversDir();

    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg',
      'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    };
    const ext = extMap[mimeType] || 'webp';
    const filename = `${id}.${ext}`;
    const filePath = path.join(COVERS_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    const coverUrl = `/covers/${filename}`;
    db.prepare('UPDATE novels SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(coverUrl, id);

    return NextResponse.json({
      success: true,
      cover_url: coverUrl,
      size: buffer.length
    });
  } catch (error) {
    console.error('Upload cover error:', error);
    return NextResponse.json({ success: false, error: 'server error' }, { status: 500 });
  }
}
