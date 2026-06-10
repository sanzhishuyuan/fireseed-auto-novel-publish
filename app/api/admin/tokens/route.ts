import { NextRequest, NextResponse } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export const GET = withRoute({ auth: 'admin', permission: 'token.manage' }, async (request, ctx: AdminContext) => {
  const tokens = db.prepare('SELECT * FROM ai_tokens ORDER BY created_at DESC').all();
  return NextResponse.json({ tokens });
});

export const POST = withRoute({ auth: 'admin', permission: 'token.manage', body: true }, async (request, ctx: AdminContext) => {
  const { name, permissions } = ctx.body;
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const id = uuidv4();

  db.prepare('INSERT INTO ai_tokens (id, token, name, permissions) VALUES (?, ?, ?, ?)')
    .run(id, token, name || '未命名Token', permissions || 'read,write');

  return apiSuccess({ token, id });
});
