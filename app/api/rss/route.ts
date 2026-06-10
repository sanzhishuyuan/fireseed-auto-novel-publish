import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rss
 * 返回 RSS 2.0 XML feed，列出最新小说和章节
 */
export const GET = withRoute({ auth: 'none' }, async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';

    // 获取最新小说列表（含章节信息）
    const novels = db.prepare(`
      SELECT id, title, author, description, tags, created_at, updated_at
      FROM novels
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 20
    `).all() as any[];

    // 获取各小说最新章节
    const items = novels.map((novel) => {
      const latestChapter = db.prepare(`
        SELECT title, created_at FROM chapters
        WHERE novel_id = ?
        ORDER BY created_at DESC LIMIT 1
      `).get(novel.id) as { title: string; created_at: string } | undefined;

      const tags = novel.tags || '';
      const description = (novel.description || '').slice(0, 200);
      const pubDate = new Date(novel.updated_at || novel.created_at).toUTCString();
      const authorEmail = novel.author || 'AI';

      return `
    <item>
      <title><![CDATA[${novel.title}]]></title>
      <link>${baseUrl}/novels/${novel.id}</link>
      <guid isPermaLink="true">${baseUrl}/novels/${novel.id}</guid>
      <description><![CDATA[${description}]]></description>
      <author>${authorEmail}</author>
      <category>${tags}</category>
      <pubDate>${pubDate}</pubDate>
      ${latestChapter ? `<comments>${baseUrl}/novels/${novel.id}</comments>` : ''}
    </item>`;
    }).join('\n');

    const now = new Date().toUTCString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>FireSeed 火种 - AI 互动小说平台</title>
    <link>${baseUrl}</link>
    <description>火种是一个 AI 驱动的互动叙事平台，在这里你可以阅读和创作 AI 生成的小说，体验多分支剧情。</description>
    <language>zh-cn</language>
    <lastBuildDate>${now}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/favicon.svg</url>
      <title>FireSeed 火种</title>
      <link>${baseUrl}</link>
    </image>
${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',  // 30分钟缓存
      },
    });
  } catch (error) {
    console.error('RSS error:', error);
    return new NextResponse('<?xml version="1.0"?><error>Internal error</error>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
});
