import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { safeParseJSON } from '@/lib/request-parser';

// 反馈类型枚举
const VALID_TYPES = ['bug', 'feature', 'question', 'other'] as const;
type FeedbackType = typeof VALID_TYPES[number];

interface FeedbackBody {
  type?: string;
  title?: string;
  message?: string;
  contact?: string;
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    // 必填校验
    const type = body.type || 'other';
    const title = (body.title || '').trim();
    const message = (body.message || '').trim();

    if (!title) {
      return NextResponse.json({ success: false, error: '请填写反馈标题' }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ success: false, error: '标题过长，最多200字' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ success: false, error: '请填写反馈内容' }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ success: false, error: '反馈内容过长，最多5000字' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type as FeedbackType)) {
      return NextResponse.json({ success: false, error: '无效的反馈类型' }, { status: 400 });
    }

    const contact = (body.contact || '').trim().slice(0, 200);
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO feedback (id, type, title, message, contact, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(id, type, title, message, contact || null, now, now);

    return NextResponse.json({
      success: true,
      message: '反馈已提交，感谢您的宝贵意见！',
      id,
    });
  } catch (error) {
    console.error('[Feedback] POST error:', error);
    return NextResponse.json({ success: false, error: '提交失败，请稍后重试' }, { status: 500 });
  }
}
