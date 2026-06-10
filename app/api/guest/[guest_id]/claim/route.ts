import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { safeParseJSON } from '@/lib/request-parser';

// 认领访客作品
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { guest_id, guest_novel_ids, user_id } = parsed.data;
    
    if (!guest_id || !guest_novel_ids || !user_id) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    const novelIds = Array.isArray(guest_novel_ids) ? guest_novel_ids : [guest_novel_ids];
    const results = [];
    
    for (const guestNovelId of novelIds) {
      // 获取访客作品
      const guestNovel = db.prepare(
        'SELECT * FROM guest_novels WHERE id = ? AND guest_id = ?'
      ).get(guestNovelId, guest_id) as Record<string, unknown> | undefined;
      
      if (!guestNovel) {
        results.push({ id: guestNovelId, success: false, error: '作品不存在' });
        continue;
      }
      
      // 创建正式作品
      const newNovelId = uuidv4();
      
      db.prepare(`
        INSERT INTO novels (id, title, author, description, status, tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        newNovelId,
        guestNovel.title,
        guestNovel.author || '',
        guestNovel.description || '',
        guestNovel.status || 'draft',
        guestNovel.tags || ''
      );
      
      // 创建内容目录
      const novelsDir = path.join(process.cwd(), 'content', 'novels', newNovelId);
      fs.mkdirSync(novelsDir, { recursive: true });
      fs.mkdirSync(path.join(novelsDir, 'chapters'), { recursive: true });
      fs.mkdirSync(path.join(novelsDir, 'branches'), { recursive: true });
      
      // 创建 meta.md
      const meta = matter.stringify('', {
        title: guestNovel.title,
        author: guestNovel.author || '',
        description: guestNovel.description || '',
        status: guestNovel.status || 'draft',
        tags: guestNovel.tags || '',
        created_at: new Date().toISOString(),
        claimed_from: guest_id
      });
      fs.writeFileSync(path.join(novelsDir, 'meta.md'), meta);
      
      // 获取并迁移章节
      const chapters = db.prepare(`
        SELECT * FROM guest_chapters WHERE guest_novel_id = ? ORDER BY order_num ASC
      `).all(guestNovelId) as Array<Record<string, unknown>>;
      
      for (const chapter of chapters) {
        const chapterId = uuidv4();
        
        // 保存到文件系统
        const chaptersDir = path.join(novelsDir, 'chapters');
        const chapterMeta = {
          title: chapter.title,
          book: newNovelId,
          order: chapter.order_num,
          branch: chapter.branch || 'main',
          created_at: new Date().toISOString()
        };
        
        const fileContent = matter.stringify(chapter.content as string || '', chapterMeta);
        fs.writeFileSync(path.join(chaptersDir, `${chapterId}.md`), fileContent, 'utf-8');
        
        // 保存到数据库
        db.prepare(`
          INSERT INTO chapters (id, novel_id, title, content, order_num, branch, word_count)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          chapterId,
          newNovelId,
          chapter.title,
          chapter.content || '',
          chapter.order_num || 1,
          chapter.branch || 'main',
          chapter.word_count || 0
        );
      }
      
      // 删除访客数据（可选：保留作为备份）
      // db.prepare('DELETE FROM guest_chapters WHERE guest_novel_id = ?').run(guestNovelId);
      // db.prepare('DELETE FROM guest_novels WHERE id = ?').run(guestNovelId);
      
      results.push({
        id: guestNovelId,
        success: true,
        new_novel_id: newNovelId,
        title: guestNovel.title,
        chapter_count: chapters.length
      });
    }
    
    return NextResponse.json({
      success: true,
      claimed: results.filter(r => r.success).length,
      results
    });
  } catch (error) {
    console.error('Claim novels error:', error);
    return NextResponse.json({ error: '认领失败' }, { status: 500 });
  }
}
