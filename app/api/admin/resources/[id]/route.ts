import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['verified', 'rejected'] as const;
type StatusType = typeof VALID_STATUSES[number];

interface ResourceRow {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  tags: string;
  provider_id: string | null;
  provider_name: string;
  status: string;
  useful_count: number;
  useless_count: number;
  verified_count: number;
  last_verified_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * PATCH /api/admin/resources/[id]
 * 管理员审核资源
 */
export const PATCH = withRoute({ auth: 'admin', permission: 'content.edit', body: true }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  const { status } = ctx.body;

  if (!status || !VALID_STATUSES.includes(status as StatusType)) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的状态值，必须为 verified 或 rejected', 400);
  }

  const resource = db.prepare(
    'SELECT * FROM trusted_resources WHERE id = ?'
  ).get(id) as ResourceRow | undefined;

  if (!resource) {
    return apiError('NOT_FOUND', '资源不存在', 404);
  }

  const now = new Date().toISOString();

  if (status === 'verified') {
    db.prepare(`
      UPDATE trusted_resources
      SET status = 'verified', verified_count = verified_count + 1, last_verified_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(now, id);
  } else {
    db.prepare(`
      UPDATE trusted_resources
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  }

  // 记录验证日志
  db.prepare(`
    INSERT INTO resource_verification_log (id, resource_id, checker_type, result, detail)
    VALUES (lower(hex(randomblob(16))), ?, 'admin', ?, ?)
  `).run(id, status, `审核人: ${ctx.admin.username || ctx.admin.nickname}`);

  const updated = db.prepare('SELECT * FROM trusted_resources WHERE id = ?').get(id) as ResourceRow;

  return apiSuccess(updated);
});
