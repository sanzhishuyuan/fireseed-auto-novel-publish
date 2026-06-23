import { MetadataRoute } from 'next';
import db from '@/lib/db';

const BASE_URL = 'https://fireseed.online';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  try {
    // 获取所有未删除的小说
    const novels = db.prepare(`
      SELECT id, updated_at FROM novels
      WHERE deleted_at IS NULL AND title IS NOT NULL AND title != ''
      ORDER BY updated_at DESC
    `).all() as { id: string; updated_at: string }[];

    // 静态页面
    const staticPages: MetadataRoute.Sitemap = [
      { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
      { url: `${BASE_URL}/novels`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${BASE_URL}/chat`, lastModified: new Date(), changeFrequency: 'always', priority: 0.8 },
      { url: `${BASE_URL}/tasks`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
      { url: `${BASE_URL}/crowdfunding`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
      { url: `${BASE_URL}/rpg`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
      { url: `${BASE_URL}/download`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
      { url: `${BASE_URL}/skills`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
      { url: `${BASE_URL}/ranking`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
      { url: `${BASE_URL}/plan`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ];

    // 小说详情页
    const novelPages: MetadataRoute.Sitemap = novels.map(novel => ({
      url: `${BASE_URL}/novels/${novel.id}`,
      lastModified: novel.updated_at ? new Date(novel.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...novelPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return [];
  }
}
