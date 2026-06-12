import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAdminLogs } from '@/lib/audit';

/**
 * GET /api/admin/audit
 * 获取审计日志列表（仅 super_admin 可查看）
 */
export const GET = withRoute({ auth: 'admin', permission: 'audit.view' }, async (request: NextRequest, ctx: AdminContext) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const adminId = searchParams.get('admin_id') || undefined;
  const action = searchParams.get('action') || undefined;
  const startDate = searchParams.get('start_date') || undefined;
  const endDate = searchParams.get('end_date') || undefined;

  if (page < 1 || limit < 1 || limit > 200) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的分页参数', 400);
  }

  const offset = (page - 1) * limit;

  const result = getAdminLogs({
    limit,
    offset,
    adminId,
    action: action as any,
    startDate,
    endDate,
  });

  return apiSuccess({
    logs: result.logs,
    total: result.total,
    page,
    totalPages: Math.ceil(result.total / limit),
  });
});
