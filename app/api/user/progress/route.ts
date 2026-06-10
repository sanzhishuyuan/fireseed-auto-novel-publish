import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { novelId, branch, chapterId } = ctx.body;
  const userId = ctx.user.id;

  const existing = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND novel_id = ?')
    .get(userId, novelId);

  if (existing) {
    db.prepare(`
      UPDATE user_progress 
      SET branch = ?, chapter_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND novel_id = ?
    `).run(branch, chapterId, userId, novelId);
  } else {
    db.prepare(`
      INSERT INTO user_progress (id, user_id, novel_id, branch, chapter_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, novelId, branch, chapterId);
  }

  return apiSuccess(true);
});
