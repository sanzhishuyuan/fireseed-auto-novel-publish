'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MyProject {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  supporter_count: number;
  deadline: string;
  status: string;
  progress_percentage?: number;
  days_left?: number;
  type: 'created' | 'supported';
  supported_amount?: number;
}

export default function MyCrowdfundingPage() {
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'created' | 'supported'>('created');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 加载用户信息
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setCurrentUser(data.user);
        } else {
          window.location.href = '/auth/login';
        }
      } catch (error) {
        console.error('加载用户失败:', error);
      }
    };
    loadUser();
  }, []);

  // 加载我的众筹项目
  useEffect(() => {
    if (!currentUser) return;

    const loadProjects = async () => {
      try {
        setLoading(true);
        
        // 这里需要创建一个新的API来获取用户的众筹项目
        // 暂时使用模拟数据
        const mockProjects: MyProject[] = [
          {
            id: '1',
            title: '科幻小说《星际迷航》',
            target_amount: 5000,
            current_amount: 3500,
            supporter_count: 28,
            deadline: '2026-09-10T00:00:00.000Z',
            status: 'active',
            progress_percentage: 70,
            days_left: 15,
            type: 'created'
          },
          {
            id: '2',
            title: '奇幻小说《魔法学院》',
            target_amount: 3000,
            current_amount: 3000,
            supporter_count: 45,
            deadline: '2026-08-01T00:00:00.000Z',
            status: 'successful',
            progress_percentage: 100,
            days_left: -10,
            type: 'supported',
            supported_amount: 200
          }
        ];

        // 过滤当前标签的项目
        const filtered = mockProjects.filter(p => p.type === activeTab);
        setProjects(filtered);
      } catch (error) {
        console.error('加载项目失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [currentUser, activeTab]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
            💰 我的众筹
          </h1>
          <p className="text-muted-foreground">
            管理我发起和支持的众筹项目
          </p>
        </div>

        {/* 标签切换 */}
        <div className="bg-card border rounded-lg p-2 mb-6 inline-flex gap-2">
          <button
            onClick={() => setActiveTab('created')}
            className={`px-6 py-2 rounded-lg transition-colors ${
              activeTab === 'created'
                ? 'bg-primary text-white'
                : 'hover:bg-secondary'
            }`}
          >
            我发起的 ({projects.filter(p => p.type === 'created').length})
          </button>
          <button
            onClick={() => setActiveTab('supported')}
            className={`px-6 py-2 rounded-lg transition-colors ${
              activeTab === 'supported'
                ? 'bg-primary text-white'
                : 'hover:bg-secondary'
            }`}
          >
            我支持的 ({projects.filter(p => p.type === 'supported').length})
          </button>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg">
            <div className="text-6xl mb-4">{activeTab === 'created' ? '🚀' : '💝'}</div>
            <h3 className="text-xl font-semibold mb-2">
              {activeTab === 'created' ? '暂无发起的项目' : '暂无支持的项目'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {activeTab === 'created' 
                ? '发起你的第一个众筹项目吧！'
                : '去众筹广场支持你喜欢的项目吧！'
              }
            </p>
            <Link
              href={activeTab === 'created' ? '/crowdfunding?new=1' : '/crowdfunding'}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90"
            >
              {activeTab === 'created' ? '发起众筹' : '浏览众筹'}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/crowdfunding/${project.id}`}
                className="block bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{project.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        project.status === 'successful' ? 'bg-green-100 text-green-800' :
                        project.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {project.status === 'successful' ? '已成功' :
                         project.status === 'failed' ? '已失败' : '进行中'}
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="mb-3">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-purple-600"
                          style={{ width: `${Math.min(project.progress_percentage || 0, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{project.progress_percentage || 0}%</span>
                        <span>{project.current_amount} / {project.target_amount} SEED</span>
                      </div>
                    </div>

                    {/* 统计信息 */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>👥 {project.supporter_count} 支持者</span>
                      <span>📅 {formatDate(project.deadline)}</span>
                      {project.days_left !== undefined && project.days_left > 0 && (
                        <span className={project.days_left <= 3 ? 'text-red-600' : ''}>
                          ⏰ 剩余 {project.days_left} 天
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 支持金额（仅支持的项目显示） */}
                  {project.type === 'supported' && project.supported_amount && (
                    <div className="text-right ml-4">
                      <div className="text-sm text-muted-foreground">我已支持</div>
                      <div className="text-xl font-bold text-primary">
                        {project.supported_amount} SEED
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
