import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAI } from '@/lib/ai-auth';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireAI(request);
  if (!auth.valid) return apiError('UNAUTHORIZED', 'Unauthorized', 401);
  const tokenRecord = db.prepare('SELECT quota_used, quota_limit, quota_reset_at FROM ai_tokens WHERE token = ?').get(auth.token) as Record<string, unknown>;
  const now = new Date();
  const resetAt = new Date(tokenRecord.quota_reset_at as string);
  if (now >= resetAt) {
    db.prepare('UPDATE ai_tokens SET quota_used = 0, quota_reset_at = datetime("now", "+1 day") WHERE token = ?').run(auth.token);
    tokenRecord.quota_used = 0;
    tokenRecord.quota_reset_at = new Date(resetAt.getTime() + 86400000).toISOString();
  }
  return NextResponse.json({
    success: true,
    quota_used: tokenRecord.quota_used,
    quota_limit: tokenRecord.quota_limit,
    quota_remaining: Math.max(0, (tokenRecord.quota_limit as number) - (tokenRecord.quota_used as number)),
    quota_reset_at: tokenRecord.quota_reset_at
  });
}
