import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-novel-secret-key-2024';

function verifyAIToken(request: NextRequest): { valid: boolean; token: string } {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { valid: false, token: '' };
  const token = authHeader.slice(7);

  // 1. 优先验证 JWT Token
  try {
    jwt.verify(token, JWT_SECRET);
    return { valid: true, token };
  } catch {
    // JWT 无效，继续
  }

  // 2. 检查 user_tokens
  const userToken = db.prepare(
    'SELECT id FROM user_tokens WHERE token = ? AND is_active = 1'
  ).get(token);
  if (userToken) return { valid: true, token };

  // 3. 兼容旧 ai_tokens
  const record = db.prepare('SELECT id FROM ai_tokens WHERE token = ? AND is_active = 1').get(token);
  if (!record) return { valid: false, token };
  return { valid: true, token };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = verifyAIToken(request);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
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
  const auth = verifyAIToken(request);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
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
