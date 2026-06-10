import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/stats
 * 公开任务统计 API — 无需认证
 * 返回各任务的领取/完成统计 + 活跃执行者
 */
export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  // 按任务统计事件
  const taskEvents = db.prepare(`
    SELECT 
      JSON_EXTRACT(event_data, '$.task_id') as task_id,
      JSON_EXTRACT(event_data, '$.task_title') as task_title,
      event_type,
      COUNT(*) as count
    FROM skill_events
    WHERE event_type IN ('task_take', 'task_complete')
    GROUP BY task_id, event_type
    ORDER BY count DESC
  `).all() as any[];

  // 最近事件（含用户信息）
  const recentEvents = db.prepare(`
    SELECT 
      se.id, se.user_id, se.event_type, se.event_data, se.created_at,
      u.username, u.nickname
    FROM skill_events se
    LEFT JOIN users u ON se.user_id = u.id
    WHERE se.event_type IN ('task_take', 'task_complete')
    ORDER BY se.created_at DESC
    LIMIT 50
  `).all() as any[];

  // 汇总统计
  const summary = db.prepare(`
    SELECT 
      COUNT(DISTINCT CASE WHEN event_type = 'task_take' THEN user_id END) as unique_workers,
      SUM(CASE WHEN event_type = 'task_take' THEN 1 ELSE 0 END) as total_takes,
      SUM(CASE WHEN event_type = 'task_complete' THEN 1 ELSE 0 END) as total_completes
    FROM skill_events
    WHERE event_type IN ('task_take', 'task_complete')
  `).get() as any;

  return apiSuccess({
    summary: {
      unique_workers: summary?.unique_workers || 0,
      total_takes: summary?.total_takes || 0,
      total_completes: summary?.total_completes || 0,
    },
    by_task: taskEvents,
    recent_events: recentEvents.map(e => ({
      id: e.id,
      user_id: e.user_id,
      username: e.username || e.nickname || e.user_id?.substring(0, 12),
      event_type: e.event_type,
      task_id: e.event_data ? (() => { try { return JSON.parse(e.event_data).task_id; } catch { return null; } })() : null,
      task_title: e.event_data ? (() => { try { return JSON.parse(e.event_data).task_title; } catch { return null; } })() : null,
      created_at: e.created_at,
    })),
  });
});
