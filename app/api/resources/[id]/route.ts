import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

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
 * GET /api/resources/[id]
 * 获取单个资源详情
 *
 * Auth: 可选（已登录时返回 user_vote 状态）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const resource = db.prepare(
      'SELECT * FROM trusted_resources WHERE id = ? AND is_active = 1'
    ).get(id) as ResourceRow | undefined;

    if (!resource) {
      return apiError('NOT_FOUND', '资源不存在', 404);
    }

    // 获取投票统计
    const usefulCount = db.prepare(
      "SELECT COUNT(*) as c FROM resource_votes WHERE resource_id = ? AND vote = 'useful'"
    ).get(id) as { c: number };

    const uselessCount = db.prepare(
      "SELECT COUNT(*) as c FROM resource_votes WHERE resource_id = ? AND vote = 'useless'"
    ).get(id) as { c: number };

    // 如果用户已登录，返回他们的投票
    const userId = getUserIdFromRequest(request);
    let userVote: string | null = null;

    if (userId) {
      const existing = db.prepare(
        'SELECT vote FROM resource_votes WHERE voter_id = ? AND resource_id = ?'
      ).get(userId, id) as { vote: string } | undefined;
      if (existing) {
        userVote = existing.vote;
      }
    }

    return apiSuccess({
      ...resource,
      useful_count: usefulCount.c,
      useless_count: uselessCount.c,
      user_vote: userVote,
    });
  } catch (error) {
    console.error('[Resources] GET by ID error:', error);
    return apiError('INTERNAL_ERROR', '获取资源详情失败', 500);
  }
}

/**
 * PATCH /api/resources/[id]
 * 更新资源信息（仅所有者或管理员）
 *
 * Body: { title?, url?, description?, tags? }
 * Auth: 必须登录且是资源所有者或管理员
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return apiError('AUTH_REQUIRED', '请先登录', 401);
    }

    const resource = db.prepare(
      'SELECT * FROM trusted_resources WHERE id = ? AND is_active = 1'
    ).get(id) as ResourceRow | undefined;

    if (!resource) {
      return apiError('NOT_FOUND', '资源不存在', 404);
    }

    // 检查权限：必须是资源所有者或管理员
    const isOwner = resource.provider_id === userId;
    const isAdmin = checkIsAdmin(userId);

    if (!isOwner && !isAdmin) {
      return apiError('FORBIDDEN', '无权修改此资源', 403);
    }

    const bodyText = await request.text();

    const parsed = safeParseJSON(bodyText);

    if (!parsed.success) return parsed.response;

    const body = parsed.data;
    const { title, url, description, tags } = body;

    // 构建更新字段
    const updates: string[] = [];
    const updateParams: any[] = [];

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return apiError('VALIDATION_INVALID_PARAM', '标题不能为空', 400);
      }
      updates.push('title = ?');
      updateParams.push(title.trim());
    }

    if (url !== undefined) {
      if (typeof url !== 'string' || !url.trim()) {
        return apiError('VALIDATION_INVALID_PARAM', 'URL 不能为空', 400);
      }

      // URL 唯一性检查（排除自身）
      const existingUrl = db.prepare(
        'SELECT id FROM trusted_resources WHERE url = ? AND is_active = 1 AND id != ?'
      ).get(url.trim(), id) as { id: string } | undefined;

      if (existingUrl) {
        return apiError('VALIDATION_DUPLICATE', '该 URL 已被其他资源使用', 409);
      }

      updates.push('url = ?');
      updateParams.push(url.trim());
    }

    if (description !== undefined) {
      if (typeof description === 'string' && description.length > 500) {
        return apiError('VALIDATION_INVALID_PARAM', '描述不能超过500字', 400);
      }
      updates.push('description = ?');
      updateParams.push(description?.trim() || null);
    }

    if (tags !== undefined) {
      const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
      updates.push('tags = ?');
      updateParams.push(tagsStr || '');
    }

    if (updates.length === 0) {
      return apiError('VALIDATION_NO_CHANGES', '没有需要更新的字段', 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(id);

    db.prepare(
      `UPDATE trusted_resources SET ${updates.join(', ')} WHERE id = ?`
    ).run(...updateParams);

    // 返回更新后的资源
    const updated = db.prepare('SELECT * FROM trusted_resources WHERE id = ?').get(id) as ResourceRow;

    // 获取投票统计
    const usefulCount = db.prepare(
      "SELECT COUNT(*) as c FROM resource_votes WHERE resource_id = ? AND vote = 'useful'"
    ).get(id) as { c: number };
    const uselessCount = db.prepare(
      "SELECT COUNT(*) as c FROM resource_votes WHERE resource_id = ? AND vote = 'useless'"
    ).get(id) as { c: number };

    return apiSuccess({
      ...updated,
      useful_count: usefulCount.c,
      useless_count: uselessCount.c,
    });
  } catch (error) {
    console.error('[Resources] PATCH error:', error);
    return apiError('INTERNAL_ERROR', '更新资源失败', 500);
  }
}

/**
 * DELETE /api/resources/[id]
 * 软删除资源（仅所有者或管理员）
 *
 * Auth: 必须登录且是资源所有者或管理员
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return apiError('AUTH_REQUIRED', '请先登录', 401);
    }

    const resource = db.prepare(
      'SELECT * FROM trusted_resources WHERE id = ? AND is_active = 1'
    ).get(id) as ResourceRow | undefined;

    if (!resource) {
      return apiError('NOT_FOUND', '资源不存在', 404);
    }

    // 检查权限：必须是资源所有者或管理员
    const isOwner = resource.provider_id === userId;
    const isAdmin = checkIsAdmin(userId);

    if (!isOwner && !isAdmin) {
      return apiError('FORBIDDEN', '无权删除此资源', 403);
    }

    // 软删除
    db.prepare('UPDATE trusted_resources SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    return apiSuccess({ id, deleted: true });
  } catch (error) {
    console.error('[Resources] DELETE error:', error);
    return apiError('INTERNAL_ERROR', '删除资源失败', 500);
  }
}

/**
 * 检查用户是否为管理员
 */
function checkIsAdmin(userId: string): boolean {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
  if (!user) return false;
  return ['admin', 'super_admin', 'editor', 'viewer'].includes(user.role);
}
