import { NextResponse } from 'next/server';
import { getAllNovelIds } from '@/lib/novels';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

// 测试/自动化数据过滤名单（标题关键词）
const TEST_PATTERNS = [
  '自动化测试',
  'test_',
  'aitest_',
];

function isTestNovel(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return TEST_PATTERNS.some(pattern => lowerTitle.includes(pattern.toLowerCase()));
}

// 检测标题是否包含乱码（连续问号或不可识别字符）
function hasGarbledTitle(title: string): boolean {
  // 连续 3 个以上问号，或标题中超过一半是问号
  if (/\?{3,}/.test(title) || /？{3,}/.test(title)) return true;
  const questionMarks = (title.match(/\?|？/g) || []).length;
  if (title.length > 0 && questionMarks / title.length > 0.5) return true;
  return false;
}

export const GET = withRoute({ auth: 'none' }, async () => {
  try {
    // 1. 从数据库读取所有未删除的小说
    const dbNovels = db.prepare(`
      SELECT 
        n.id, n.title, n.author, n.description, n.cover_url, n.status, n.tags, n.category,
        n.created_at, n.updated_at,
        COUNT(c.id) as chapter_count
      FROM novels n
      LEFT JOIN chapters c ON n.id = c.novel_id
      WHERE n.deleted_at IS NULL
      GROUP BY n.id
      ORDER BY n.updated_at DESC
    `).all() as any[];

    // 2. 从文件系统读取小说（兼容旧版内容目录）
    const fileNovels = getAllNovelIds();
    const fileNovelIds = new Set(fileNovels.map(n => n.id));

    // 3. 合并数据：数据库优先，文件系统补充
    const novelsMap = new Map<string, any>();

    // 先加入数据库小说
    for (const novel of dbNovels) {
      // 确保标题编码正确
      const title = novel.title || '';
      
      novelsMap.set(novel.id, {
        id: novel.id,
        title,
        author: novel.author || 'FireSeed AI',
        description: novel.description || '',
        cover_url: novel.cover_url || '',
        tags: novel.tags || '',
        category: novel.category || '',
        status: novel.status || 'ongoing',
        chapterCount: novel.chapter_count || 0,
        createdAt: novel.created_at,
        updatedAt: novel.updated_at
      });
    }

    // 再加入文件系统小说（排除已在数据库中的）
    for (const novel of fileNovels) {
      if (!novelsMap.has(novel.id)) {
        const chapters = db.prepare(`
          SELECT COUNT(*) as count FROM chapters WHERE novel_id = ?
        `).get(novel.id) as { count: number } | undefined;

        novelsMap.set(novel.id, {
          id: novel.id,
          title: novel.title || novel.id,
          author: novel.author || 'FireSeed AI',
          description: novel.description || '',
          cover_url: '',
          tags: novel.tags || '',
          category: novel.category || '',
          status: novel.status || 'ongoing',
          chapterCount: chapters?.count || 0,
          updatedAt: novel.updated_at || new Date().toISOString()
        });
      }
    }

    // 4. 过滤：排除无标题、测试数据、乱码标题
    const novels = Array.from(novelsMap.values()).filter(n => {
      if (!n.title || n.title.trim() === '') return false;
      if (isTestNovel(n.title)) return false;
      if (hasGarbledTitle(n.title)) return false;
      return true;
    });

    return NextResponse.json({ success: true, novels });
  } catch (error) {
    console.error('Get novels error:', error);
    return NextResponse.json({ success: false, novels: [] }, { status: 500 });
  }
});
