import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planType = searchParams.get('planType') || 'free';

    // 获取指定套餐的权益
    const benefits = db.prepare(`
      SELECT benefit_key, benefit_value, description
      FROM vip_benefits
      WHERE plan_type = ?
      ORDER BY benefit_key
    `).all(planType) as Array<{
      benefit_key: string;
      benefit_value: string;
      description: string;
    }>;

    // 获取所有套餐类型
    const allPlans = db.prepare(`
      SELECT DISTINCT plan_type
      FROM vip_benefits
      ORDER BY plan_type
    `).all() as Array<{ plan_type: string }>;

    // 构建所有套餐的权益对比
    const allBenefits: Record<string, any> = {};

    for (const plan of allPlans) {
      const planBenefits = db.prepare(`
        SELECT benefit_key, benefit_value, description
        FROM vip_benefits
        WHERE plan_type = ?
      `).all(plan.plan_type) as Array<{
        benefit_key: string;
        benefit_value: string;
        description: string;
      }>;

      allBenefits[plan.plan_type] = planBenefits.map(b => ({
        key: b.benefit_key,
        value: b.benefit_value,
        description: b.description
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        currentPlan: planType,
        benefits: benefits.map(b => ({
          key: b.benefit_key,
          value: b.benefit_value,
          description: b.description
        })),
        allPlans: allBenefits
      }
    });

  } catch (error) {
    console.error('VIP benefits error:', error);
    return NextResponse.json(
      { error: '获取VIP权益失败' },
      { status: 500 }
    );
  }
}
