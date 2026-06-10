import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

// 反馈类型枚举
const VALID_TYPES = ['bug', 'feature', 'question', 'other'] as const;
type FeedbackType = typeof VALID_TYPES[number];

export const POST = withRoute({ auth: 'none', body: true }, async (request, ctx) => {
  // 必填校验
  const type = ctx.body.type || 'other';
  const title = (ctx.body.title || '').trim();
  const message = (ctx.body.message || '').trim();

  if (!title) {
    return apiError('VALIDATION_REQUIRED', '请填写反馈标题', 400);
  }
  if (title.length > 200) {
    return apiError('VALIDATION_INVALID_PARAM', '标题过长，最多200字', 400);
  }
  if (!message) {
    return apiError('VALIDATION_REQUIRED', '请填写反馈内容', 400);
  }
  if (message.length > 5000) {
    return apiError('VALIDATION_INVALID_PARAM', '反馈内容过长，最多5000字', 400);
  }
  if (!VALID_TYPES.includes(type as FeedbackType)) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的反馈类型', 400);
  }

  const contact = (ctx.body.contact || '').trim().slice(0, 200);
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO feedback (id, type, title, message, contact, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(id, type, title, message, contact || null, now, now);

  return apiSuccess({ message: '反馈已提交，感谢您的宝贵意见！', id });
});
