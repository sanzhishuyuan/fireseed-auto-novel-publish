import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { safeParseJSON } from '@/lib/request-parser';

// 创建访客作品
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { guest_id, title, author, description, status, tags } = parsed.data;
    
    if (!guest_id || !title) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    const novelId = uuidv4();
    
    db.prepare(`
      INSERT INTO guest_novels (id, guest_id, title, author, description, status, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(novelId, guest_id, title, author || '', description || '', status || 'draft', tags || '');
    
    return NextResponse.json({
      success: true,
      id: novelId,
      guest_id: guest_id,
      title,
      author: author || '',
      description: description || '',
      status: status || 'draft',
      tags: tags || ''
    });
  } catch (error) {
    console.error('Create guest novel error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
