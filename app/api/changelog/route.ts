import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/changelog
 * 读取 changelog.json 返回更新日志
 */
export const GET = withRoute({ auth: 'none' }, async () => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'changelog.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const entries = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      entries: Array.isArray(entries) ? entries : []
    });
  } catch (error) {
    console.error('[Changelog] Error:', error);
    return NextResponse.json({ success: true, entries: [] });
  }
});
