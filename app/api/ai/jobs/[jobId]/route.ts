import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireAI } from '@/lib/ai-auth';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = requireAI(request);
  if (!auth.valid) return apiError('UNAUTHORIZED', 'Unauthorized', 401);
  const { jobId } = await params;
  const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ? AND token = ?').get(jobId, auth.token) as Record<string, unknown> | undefined;
  if (!job) return NextResponse.json({ error: 'Job not found', code: 'not_found' }, { status: 404 });
  const result = job.result ? JSON.parse(job.result as string) : null;
  return NextResponse.json({
    success: true, job_id: job.id, job_type: job.job_type,
    novel_id: job.novel_id, chapter_id: job.chapter_id,
    status: job.status, stage: job.stage,
    result, error: job.error,
    created_at: job.created_at, updated_at: job.updated_at
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAI(request);
  if (!auth.valid) return apiError('UNAUTHORIZED', 'Unauthorized', 401);
  const { job_type, novel_id, chapter_id, payload } = await request.json();
  if (!job_type || !['publish_chapter'].includes(job_type)) {
    return NextResponse.json({ error: 'Invalid job_type', code: 'bad_request' }, { status: 400 });
  }
  const jobId = uuidv4();
  db.prepare(
    'INSERT INTO ai_jobs (id, token, job_type, novel_id, chapter_id, status, stage, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(jobId, auth.token, job_type, novel_id || null, chapter_id || null, 'queued', 'queued', JSON.stringify(payload));
  return NextResponse.json({ success: true, job_id: jobId, status: 'queued' });
}
