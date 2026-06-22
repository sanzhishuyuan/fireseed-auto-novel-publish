import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/fireseed-changelog
 * 读取 changelog.json 返回更新日志
 * 使用不冲突的路径名（/api/changelog 被 nginx 路由到 MuMuAINovel）
 */
export const GET = withRoute({ auth: 'none' }, async () => {
  try {
    // 尝试多个路径（standalone 部署下 process.cwd() 可能指向 .next/standalone）
    const paths = [
      path.join(process.cwd(), 'data', 'changelog.json'),
      path.join('/root/ai-novel-lite', 'data', 'changelog.json'),
    ];
    let raw = '';
    for (const fp of paths) {
      try { raw = fs.readFileSync(fp, 'utf-8'); break; } catch {}
    }
    if (!raw) throw new Error('changelog.json not found in any path');

    const entries = JSON.parse(raw);
    return NextResponse.json({
      success: true,
      entries: Array.isArray(entries) ? entries : []
    });
  } catch (error) {
    console.error('[FireSeed Changelog] Error:', error);
    return NextResponse.json({ success: true, entries: [] });
  }
});
