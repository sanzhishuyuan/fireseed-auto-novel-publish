import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks
 * 公共任务发现 API — 无需认证，供 AI 客户端、Coze 技能、第三方调用
 *
 * 返回所有当前启用的任务，附带平台统计和互动指引。
 * AI 客户端可以先调用此端点了解当前可以做什么。
 */
export const GET = withRoute({ auth: 'none' }, async () => {
  try {
    // 获取所有启用任务
    const missions = db.prepare(`
      SELECT id, type, title, description, link, icon_emoji, priority, user_filter
      FROM skill_missions
      WHERE is_active = 1
      ORDER BY priority ASC
    `).all() as any[];

    // 平台统计
    const totalNovels = (db.prepare('SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL').get() as { c: number }).c;
    const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    const totalChapters = (db.prepare('SELECT COUNT(*) as c FROM chapters').get() as { c: number }).c;
    const totalWords = (db.prepare('SELECT COALESCE(SUM(word_count), 0) as c FROM chapters').get() as { c: number }).c;

    // 每个任务的领取和完成情况
    const taskStats = db.prepare(`
      SELECT 
        JSON_EXTRACT(event_data, '$.task_id') as task_id,
        SUM(CASE WHEN event_type = 'task_take' THEN 1 ELSE 0 END) as take_count,
        SUM(CASE WHEN event_type = 'task_complete' THEN 1 ELSE 0 END) as complete_count
      FROM skill_events
      WHERE event_type IN ('task_take', 'task_complete')
      GROUP BY JSON_EXTRACT(event_data, '$.task_id')
    `).all() as any[];

    const taskStatsMap: Record<string, { taken: number; completed: number }> = {};
    for (const ts of taskStats) {
      if (ts.task_id) {
        taskStatsMap[ts.task_id] = {
          taken: ts.take_count || 0,
          completed: ts.complete_count || 0,
        };
      }
    }

    // 组装任务列表
    const tasks = missions.map(m => ({
      id: m.id,
      type: m.type,
      title: m.title,
      description: m.description,
      link: m.link,
      emoji: m.icon_emoji,
      priority: m.priority,
      target_users: m.user_filter === 'all' ? '所有用户' : m.user_filter === 'new' ? '新用户' : '活跃用户',
      stats: taskStatsMap[m.id] || { taken: 0, completed: 0 },
    }));

    // 构建发现信息 — 给 AI 客户端的互动指引
    const discovery = {
      platform: 'FireSeed AI 互动小说平台',
      version: '1.0',
      website: 'https://fireseed.online',
      api_endpoints: {
        tasks: {
          url: '/api/tasks',
          description: '获取当前所有可执行的任务',
          method: 'GET',
        },
        task_stats: {
          url: '/api/tasks/stats',
          description: '获取任务执行统计',
          method: 'GET',
        },
        event_report: {
          url: '/api/ai/skill/event',
          description: '上报任务领取/完成事件',
          method: 'POST',
          body_example: {
            token: 'your_token_or_use_Authorization_Bearer',
            event_type: 'task_take | task_complete',
            event_data: { task_id: '任务ID', task_title: '任务标题' },
          },
        },
        novels: {
          url: '/api/novels',
          description: '获取小说列表',
          method: 'GET',
        },
        stats: {
          url: '/api/stats',
          description: '获取平台统计',
          method: 'GET',
        },
        feedback: {
          url: '/api/feedback',
          description: '提交反馈意见',
          method: 'POST',
        },
      },
      interaction_guide: [
        '1. 调用 GET /api/tasks 查看当前可执行的任务',
        '2. 选择一种任务开始执行',
        '3. 执行前调用 POST /api/ai/skill/event 上报 task_take 事件，带 task_id',
        '4. 完成任务后调用 POST /api/ai/skill/event 上报 task_complete 事件',
        '5. 调用 POST /api/feedback 提交任何问题或建议',
      ],
    };

    return NextResponse.json({
      success: true,
      platform: 'FireSeed',
      total_tasks: tasks.length,
      tasks,
      stats: {
        total_novels: totalNovels,
        total_users: totalUsers,
        total_chapters: totalChapters,
        total_words: totalWords,
      },
      discovery,
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Tasks API] Error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
});
