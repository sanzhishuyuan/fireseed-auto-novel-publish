import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import crypto from 'crypto';
import { safeParseJSON } from '@/lib/request-parser';

// 创建或获取访客会话
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { device_id } = parsed.data;
    
    // 如果提供了 device_id，尝试查找现有会话
    if (device_id) {
      const existing = db.prepare(
        'SELECT guest_id FROM guest_sessions WHERE device_id = ?'
      ).get(device_id) as { guest_id: string } | undefined;
      
      if (existing) {
        // 更新活跃时间
        db.prepare('UPDATE guest_sessions SET last_active = CURRENT_TIMESTAMP WHERE guest_id = ?')
          .run(existing.guest_id);
        
        return NextResponse.json({
          success: true,
          guest_id: existing.guest_id,
          is_new: false
        });
      }
    }
    
    // 创建新会话
    const sessionId = uuidv4();
    const guestId = `guest_${crypto.randomBytes(8).toString('hex')}`;
    
    db.prepare(`
      INSERT INTO guest_sessions (id, guest_id, device_id)
      VALUES (?, ?, ?)
    `).run(sessionId, guestId, device_id || null);
    
    return NextResponse.json({
      success: true,
      guest_id: guestId,
      is_new: true
    });
  } catch (error) {
    console.error('Guest session error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 获取访客作品列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const guestId = searchParams.get('guest_id');
  
  if (!guestId) {
    return NextResponse.json({ error: '缺少 guest_id' }, { status: 400 });
  }
  
  const novels = db.prepare(`
    SELECT 
      gn.id,
      gn.title,
      gn.author,
      gn.description,
      gn.status,
      gn.tags,
      gn.created_at,
      gn.updated_at,
      COUNT(gc.id) as chapter_count,
      SUM(COALESCE(gc.word_count, 0)) as total_words
    FROM guest_novels gn
    LEFT JOIN guest_chapters gc ON gc.guest_novel_id = gn.id
    WHERE gn.guest_id = ?
    GROUP BY gn.id
    ORDER BY gn.updated_at DESC
  `).all(guestId);
  
  return NextResponse.json({ novels });
}
