import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { JWT_SECRET } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

interface ChapterInfo {
  title: string;
  content: string;
  order: number;
}

/**
 * 解析 MD 文件，提取章节信息
 * 格式：用 ## 标记章节标题
 */
function parseMdContent(mdContent: string): { title: string; chapters: ChapterInfo[] } {
  let novelTitle = '';
  const chapters: ChapterInfo[] = [];

  // 按 ## 分割章节（排除顶部的 # 标题）
  const chapterBlocks = mdContent.split(/\n## /);

  for (let i = 0; i < chapterBlocks.length; i++) {
    const block = chapterBlocks[i];

    if (i === 0) {
      // 第一个块可能是文件级标题（# 标题）
      const topLevelMatch = block.match(/^#\s+(.+?)[\n\r]/);
      if (topLevelMatch) {
        novelTitle = topLevelMatch[1].trim();
      }
      // 如果没有以 ## 开头，可能是没有章节标记的单章小说
      const contentWithoutTitle = block.replace(/^#\s+.+?[\n\r]+/, '');
      if (contentWithoutTitle.trim() && !block.trim().startsWith('##')) {
        chapters.push({
          title: '第一章',
          content: contentWithoutTitle.trim(),
          order: 1
        });
      }
      continue;
    }

    // 解析 ## 标题
    const lines = block.split('\n');
    const rawTitle = lines[0].replace(/^#+\s*/, '').trim();
    const content = lines.slice(1).join('\n').trim();

    if (rawTitle && content) {
      const title = rawTitle.includes('章') ? rawTitle : `第${toChineseNumber(chapters.length + 1)}章 ${rawTitle}`;
      chapters.push({
        title,
        content,
        order: chapters.length + 1
      });
    }
  }

  return { title: novelTitle, chapters };
}

/**
 * 数字转中文
 */
function toChineseNumber(num: number): string {
  const chinese = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (num <= 10) return chinese[num];
  if (num < 20) return '十' + chinese[num - 10];
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return chinese[tens] + '十' + (ones > 0 ? chinese[ones] : '');
  }
  return String(num);
}

/**
 * POST /api/ai/novels/upload-md
 * 上传 MD 文件，自动解析并批量发布章节
 *
 * body: {
 *   "token": "JWT_TOKEN",
 *   "content": "# 小说标题\n\n## 第一章 xxx\n\n正文...",
 *   "title": "小说标题",     // 可选，覆盖 MD 中的标题
 *   "author": "作者",
 *   "description": "简介",   // 可选
 *   "tags": "标签1,标签2"    // 可选，逗号分隔
 * }
 */
export async function POST(request: NextRequest) {
  // P0-4: AI 发布接口速率限制（每分钟最多30次）
  const rateLimit = checkRateLimit(request, undefined, 'aiWrite');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    const body = await request.json();
    const { token, content, title, author, description, tags } = body;

    if (!token) {
      return NextResponse.json({ error: '缺少 token' }, { status: 401 });
    }

    if (!content) {
      return NextResponse.json({ error: '缺少 MD 内容' }, { status: 400 });
    }

    if (!author) {
      return NextResponse.json({ error: '缺少作者名' }, { status: 400 });
    }

    // 验证 Token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: '无效的 token' }, { status: 401 });
    }

    // 解析 frontmatter（如果存在）
    let frontmatter: Record<string, string> = {};
    let mdContent = content;

    // 检查是否有 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (frontmatterMatch) {
      const fmStr = frontmatterMatch[1];
      mdContent = frontmatterMatch[2];

      // 简单解析 frontmatter（key: value 格式）
      fmStr.split('\n').forEach((line: string) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();
          frontmatter[key] = value;
        }
      });
    }

    // 解析 MD 内容
    const parsed = parseMdContent(mdContent);
    const novelTitle = title || frontmatter.title || parsed.title || '未命名小说';
    const novelTags = tags || frontmatter.tags || '';
    const novelDescription = description || frontmatter.description || '';
    const novelCover = frontmatter.cover || frontmatter.cover_url || '';

    // 创建小说
    const novelId = `novel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO novels (id, title, author, author_id, description, cover_url, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(novelId, novelTitle, author, decoded.userId, novelDescription, novelCover, novelTags, now, now);

    // 检查每章节字数
    for (const chapter of parsed.chapters) {
      const chapterWordCount = chapter.content.replace(/\s/g, '').length;
      if (chapterWordCount < 3000) {
        return NextResponse.json({
          error: '章节字数不足',
          detail: `《${chapter.title}》仅 ${chapterWordCount} 字，每章至少 3000 字以保证阅读体验，请充实内容后重新上传`,
          chapter_title: chapter.title,
          current_word_count: chapterWordCount,
          minimum_required: 3000
        }, { status: 400 });
      }
      if (chapterWordCount > 5000) {
        return NextResponse.json({
          error: '章节字数过多',
          detail: `《${chapter.title}》共 ${chapterWordCount} 字，每章建议不超过 5000 字，请拆分为多章后重新上传`,
          chapter_title: chapter.title,
          current_word_count: chapterWordCount,
          maximum_recommended: 5000
        }, { status: 400 });
      }
    }

    // 发布所有章节
    const publishedChapters: any[] = [];

    for (const chapter of parsed.chapters) {
      const chapterId = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const wordCount = chapter.content.replace(/\s/g, '').length;

      db.prepare(`
        INSERT INTO chapters (id, novel_id, title, content, word_count, branch, order_num, created_at, choices)
        VALUES (?, ?, ?, ?, ?, 'main', ?, ?, '[]')
      `).run(chapterId, novelId, chapter.title, chapter.content, wordCount, chapter.order, now);

      publishedChapters.push({
        id: chapterId,
        title: chapter.title,
        wordCount,
        order: chapter.order,
        url: `https://fireseed.online/novels/${novelId}/${chapterId}`
      });
    }

    return NextResponse.json({
      success: true,
      novel: {
        id: novelId,
        title: novelTitle,
        author,
        description: novelDescription,
        cover_url: novelCover,
        tags: novelTags,
        url: `https://fireseed.online/novels/${novelId}`
      },
      chapters: publishedChapters,
      summary: {
        totalChapters: publishedChapters.length,
        totalWords: publishedChapters.reduce((sum, ch) => sum + ch.wordCount, 0)
      }
    });
  } catch (error) {
    console.error('Upload MD error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
