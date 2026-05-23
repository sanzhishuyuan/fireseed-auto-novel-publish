import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

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
 *
 * Body: { status: 'verified'|'rejected' }
 * Auth: requireAdmin (content.edit role)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request, 'content.edit');
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status as StatusType)) {
      return apiError('VALIDATION_INVALID_PARAM', '无效的状态值，必须为 verified 或 rejected', 400);
    }

    // 验证资源存在
    const resource = db.prepare(
      'SELECT * FROM trusted_resources WHERE id = ?'
    ).get(id) as ResourceRow | undefined;

    if (!resource) {
      return apiError('NOT_FOUND', '资源不存在', 404);
    }

    // 执行审核
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
    `).run(id, status, `审核人: ${admin.username || admin.nickname}`);

    // 返回更新后的资源
    const updated = db.prepare('SELECT * FROM trusted_resources WHERE id = ?').get(id) as ResourceRow;

    return apiSuccess(updated);
  } catch (error) {
    console.error('[Admin Resources] PATCH error:', error);
    return apiError('INTERNAL_ERROR', '审核资源失败', 500);
  }
}
