import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT p.id, p.author_id, p.novel_id, p.title, p.description,
             p.target_amount, p.current_amount, p.supporter_count,
             p.deadline, p.status, p.rewards, p.created_at,
             u.username as author_name
      FROM crowdfunding_projects p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const projects = db.prepare(query).all(status, limit, offset) as Array<{
      id: string;
      author_id: string;
      novel_id: string | null;
      title: string;
      description: string;
      target_amount: number;
      current_amount: number;
      supporter_count: number;
      deadline: string;
      status: string;
      rewards: string;
      created_at: string;
      author_name: string;
    }>;

    const { total } = db.prepare(`
      SELECT COUNT(*) as total FROM crowdfunding_projects WHERE status = ?
    `).get(status) as { total: number };

    const now = new Date().toISOString();

    const data = projects.map(p => {
      const progress = p.target_amount > 0
        ? Math.min(Math.round((p.current_amount / p.target_amount) * 100), 100)
        : 0;
      const isExpired = p.deadline < now;
      let displayStatus = p.status;
      if (isExpired && p.status === 'active') {
        displayStatus = p.current_amount >= p.target_amount ? 'funded' : 'failed';
      }

      return {
        id: p.id,
        authorId: p.author_id,
        authorName: p.author_name,
        novelId: p.novel_id,
        title: p.title,
        description: p.description,
        targetAmount: p.target_amount,
        currentAmount: p.current_amount,
        progress,
        supporterCount: p.supporter_count,
        deadline: p.deadline,
        status: displayStatus,
        isExpired,
        rewards: JSON.parse(p.rewards || '{}'),
        createdAt: p.created_at
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        projects: data,
        pagination: { total, limit, offset }
      }
    });

  } catch (error) {
    console.error('Crowdfunding list error:', error);
    return NextResponse.json({ error: '获取众筹列表失败' }, { status: 500 });
  }
}
