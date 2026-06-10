import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/changelog
 * 读取 changelog.json 返回更新日志
 */
export async function GET() {
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
}
