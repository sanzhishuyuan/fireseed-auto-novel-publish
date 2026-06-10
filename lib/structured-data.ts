/**
 * 结构化数据生成工具
 * 生成 JSON-LD schema.org 标记
 */

import type { Novel } from '@/types';

/**
 * 生成 Book schema（用于小说详情页）
 */
export function generateBookSchema(novel: Novel, baseUrl: string = 'https://fireseed.online'): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: novel.title,
    author: {
      '@type': 'Person',
      name: novel.author || 'FireSeed AI'
    },
    description: novel.description || '',
    genre: novel.tags ? novel.tags.split(',').map(t => t.trim()) : [],
    inLanguage: 'zh-CN',
    url: `${baseUrl}/novels/${novel.id}`,
    numberOfPages: novel.chapterCount || 0,
    bookFormat: 'EBook',
    datePublished: novel.created_at || new Date().toISOString(),
    dateModified: novel.updated_at || new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'FireSeed',
      url: baseUrl
    }
  };
}

/**
 * 生成 BreadcrumbList schema（面包屑导航）
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; item?: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  };
}

/**
 * 生成小说详情页面的完整结构化数据
 */
export function generateNovelPageSchema(novel: Novel, baseUrl: string = 'https://fireseed.online'): string {
  const bookSchema = generateBookSchema(novel, baseUrl);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: '首页', item: baseUrl },
    { name: '全部作品', item: `${baseUrl}/novels` },
    { name: novel.title }
  ]);

  return JSON.stringify([bookSchema, breadcrumbSchema]);
}

/**
 * 生成章节阅读页面的结构化数据
 */
export function generateChapterPageSchema(
  novel: Novel,
  chapterTitle: string,
  baseUrl: string = 'https://fireseed.online'
): string {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: '首页', item: baseUrl },
    { name: '全部作品', item: `${baseUrl}/novels` },
    { name: novel.title, item: `${baseUrl}/novels/${novel.id}` },
    { name: chapterTitle }
  ]);

  return JSON.stringify([breadcrumbSchema]);
}

/**
 * 生成列表页面的结构化数据
 */
export function generateItemListSchema(
  novels: Novel[],
  pageName: string = '全部作品',
  baseUrl: string = 'https://fireseed.online'
): string {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: '首页', item: baseUrl },
    { name: pageName }
  ]);

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageName,
    numberOfItems: novels.length,
    itemListElement: novels.slice(0, 10).map((novel, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Book',
        name: novel.title,
        url: `${baseUrl}/novels/${novel.id}`,
        author: {
          '@type': 'Person',
          name: novel.author || 'FireSeed AI'
        }
      }
    }))
  };

  return JSON.stringify([breadcrumbSchema, itemListSchema]);
}
