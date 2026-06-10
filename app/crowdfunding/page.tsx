'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCrowdfundingMetadata } from '@/lib/seo';
import type { Metadata } from 'next';



interface CrowdfundingProject {
  id: string;
  author_id: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  supporter_count: number;
  deadline: string;
  status: string;
  author_name?: string;
  progress_percentage?: number;
  days_left?: number;
}

export default function CrowdfundingPage() {
  const [projects, setProjects] = useState<CrowdfundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('newest');

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        sort: sortBy,
        page: page.toString(),
        limit: '20'
      });

      const res = await fetch(`/api/crowdfunding/list?${params}`);
      const data = await res.json();

      if (data.success) {
        setProjects(data.projects);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('加载众筹项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [page, statusFilter, sortBy]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
            💰 众筹广场
          </h1>
          <p className="text-muted-foreground">
            支持喜爱的创作项目，成为早期支持者获得专属权益
          </p>
        </div>

        {/* 筛选器 */}
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">状态</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border rounded-lg bg-background"
              >
                <option value="active">进行中</option>
                <option value="successful">已成功</option>
                <option value="failed">已失败</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">排序</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border rounded-lg bg-background"
              >
                <option value="newest">最新发布</option>
                <option value="popular">最热门</option>
                <option value="ending_soon">即将结束</option>
              </select>
            </div>
          </div>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">暂无众筹项目</h3>
            <p className="text-muted-foreground">成为第一个发起众筹的作者吧！</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/crowdfunding/${project.id}`}
                  className="block bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* 进度条 */}
                  <div className="h-2 bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all"
                      style={{ width: `${Math.min(project.progress_percentage || 0, 100)}%` }}
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1">{project.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {project.description}
                    </p>

                    {/* 进度信息 */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">已筹集</span>
                        <span className="font-bold text-primary">
                          {project.current_amount} / {project.target_amount} SEED
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">进度</span>
                        <span className="font-medium">{project.progress_percentage || 0}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">支持者</span>
                        <span>{project.supporter_count} 人</span>
                      </div>
                    </div>

                    {/* 底部信息 */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                      <span>👤 {project.author_name}</span>
                      <span className={project.days_left && project.days_left <= 3 ? 'text-red-600' : ''}>
                        ⏰ {project.days_left} 天
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-4 py-2">第 {page} / {totalPages} 页</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
