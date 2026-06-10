import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import type { AIContext } from '@/lib/with-route';
import { apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export const GET = withRoute({ auth: 'ai' }, async (request: NextRequest, ctx: AIContext) => {
  const tokenRecord = db.prepare('SELECT quota_used, quota_limit, quota_reset_at FROM ai_tokens WHERE token = ?').get(ctx.ai.token) as Record<string, unknown>;
  const now = new Date();
  const resetAt = new Date(tokenRecord.quota_reset_at as string);
  if (now >= resetAt) {
    db.prepare('UPDATE ai_tokens SET quota_used = 0, quota_reset_at = datetime("now", "+1 day") WHERE token = ?').run(ctx.ai.token);
    tokenRecord.quota_used = 0;
    tokenRecord.quota_reset_at = new Date(resetAt.getTime() + 86400000).toISOString();
  }
  return apiSuccess({
    quota_used: tokenRecord.quota_used,
    quota_limit: tokenRecord.quota_limit,
    quota_remaining: Math.max(0, (tokenRecord.quota_limit as number) - (tokenRecord.quota_used as number)),
    quota_reset_at: tokenRecord.quota_reset_at
  });
});
