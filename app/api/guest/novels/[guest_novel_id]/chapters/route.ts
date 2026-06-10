import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { safeParseJSON } from '@/lib/request-parser';

// 添加访客章节
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { guest_id, guest_novel_id, title, content, order, branch } = parsed.data;
    
    if (!guest_id || !guest_novel_id || !title) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    // 验证访客作品存在
    const novel = db.prepare(
      'SELECT id FROM guest_novels WHERE id = ? AND guest_id = ?'
    ).get(guest_novel_id, guest_id);
    
    if (!novel) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 });
    }
    
    const chapterId = uuidv4();
    const wordCount = content?.length || 0;
    
    db.prepare(`
      INSERT INTO guest_chapters (id, guest_id, guest_novel_id, title, content, order_num, branch, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(chapterId, guest_id, guest_novel_id, title, content || '', order || 1, branch || 'main', wordCount);
    
    // 更新作品更新时间
    db.prepare('UPDATE guest_novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(guest_novel_id);
    
    return NextResponse.json({
      success: true,
      id: chapterId,
      guest_novel_id,
      title,
      order: order || 1,
      word_count: wordCount
    });
  } catch (error) {
    console.error('Create guest chapter error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 获取访客章节列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const guestNovelId = searchParams.get('guest_novel_id');
  const guestId = searchParams.get('guest_id');
  
  if (!guestNovelId || !guestId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }
  
  const chapters = db.prepare(`
    SELECT id, title, order_num, branch, word_count, created_at
    FROM guest_chapters
    WHERE guest_novel_id = ? AND guest_id = ?
    ORDER BY order_num ASC
  `).all(guestNovelId, guestId);
  
  return NextResponse.json({ chapters });
}
