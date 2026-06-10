'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
  updates_count: number;
}

interface CrowdfundingReward {
  id: string;
  tier_name: string;
  min_amount: number;
  benefits: string; // JSON array
  limit_count: number;
  claimed_count: number;
}

export default function CrowdfundingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<CrowdfundingProject | null>(null);
  const [rewards, setRewards] = useState<CrowdfundingReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [supportLoading, setSupportLoading] = useState(false);

  // 支持表单
  const [selectedReward, setSelectedReward] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showSupportModal, setShowSupportModal] = useState(false);

  // 加载项目详情
  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crowdfunding/${projectId}`);
      const data = await res.json();

      if (data.success) {
        setProject(data.project);
        setRewards(data.rewards || []);
      } else {
        alert('项目不存在');
        router.push('/crowdfunding');
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载当前用户
  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };

  useEffect(() => {
    loadProject();
    loadCurrentUser();
  }, [projectId]);

  // 处理支持
  const handleSupport = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    let amount = 0;
    if (selectedReward) {
      const reward = rewards.find(r => r.tier_name === selectedReward);
      if (reward) {
        amount = reward.min_amount;
      }
    } else if (customAmount) {
      amount = parseInt(customAmount);
    }

    if (amount < 10) {
      alert('支持金额至少10 SEED');
      return;
    }

    try {
      setSupportLoading(true);
      const res = await fetch(`/api/crowdfunding/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'support',
          amount,
          reward_tier: selectedReward || undefined
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        setShowSupportModal(false);
        setSelectedReward('');
        setCustomAmount('');
        loadProject(); // 刷新项目进度
      } else {
        alert(`支持失败: ${data.error}`);
      }
    } catch (error) {
      console.error('支持失败:', error);
      alert('支持失败，请重试');
    } finally {
      setSupportLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 解析权益
  const parseBenefits = (benefitsJson: string): string[] => {
    try {
      return JSON.parse(benefitsJson);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">项目不存在</h2>
          <Link href="/crowdfunding" className="text-primary hover:underline">
            返回众筹广场
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = currentUser?.id === project.author_id;
  const isActive = project.status === 'active';
  const isSuccessful = project.status === 'successful';
  const isFailed = project.status === 'failed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 返回按钮 */}
        <Link
          href="/crowdfunding"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          ← 返回众筹广场
        </Link>

        {/* 项目头部 */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isSuccessful ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  isFailed ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {isSuccessful ? '已成功' : isFailed ? '已失败' : '进行中'}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>👤 {project.author_name}</span>
                <span>📅 {formatDate(project.deadline)}</span>
                {project.days_left !== undefined && (
                  <span className={project.days_left <= 3 ? 'text-red-600 font-medium' : ''}>
                    ⏰ 剩余 {project.days_left} 天
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">筹集进度</span>
              <span className="text-primary font-bold">{project.progress_percentage || 0}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isSuccessful ? 'bg-green-600' :
                  isFailed ? 'bg-red-600' :
                  'bg-gradient-to-r from-primary to-purple-600'
                }`}
                style={{ width: `${Math.min(project.progress_percentage || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {project.current_amount}
              </div>
              <div className="text-xs text-muted-foreground">已筹集 SEED</div>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <div className="text-2xl font-bold">
                {project.target_amount}
              </div>
              <div className="text-xs text-muted-foreground">目标 SEED</div>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <div className="text-2xl font-bold">
                {project.supporter_count}
              </div>
              <div className="text-xs text-muted-foreground">支持者</div>
            </div>
          </div>
        </div>

        {/* 项目描述 */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📖 项目介绍</h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{project.description}</p>
          </div>
        </div>

        {/* 回报档位 */}
        {rewards.length > 0 && isActive && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🎁 回报档位</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward) => {
                const benefits = parseBenefits(reward.benefits);
                const isSoldOut = reward.limit_count > 0 && reward.claimed_count >= reward.limit_count;
                
                return (
                  <div
                    key={reward.id}
                    className={`border rounded-lg p-4 ${
                      isSoldOut ? 'opacity-50' : 'hover:border-primary cursor-pointer'
                    }`}
                    onClick={() => !isSoldOut && setSelectedReward(reward.tier_name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{reward.tier_name}</h3>
                      {isSoldOut && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                          已售罄
                        </span>
                      )}
                    </div>
                    
                    <div className="text-2xl font-bold text-primary mb-2">
                      {reward.min_amount} SEED
                    </div>

                    <ul className="space-y-1 mb-3">
                      {benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span>✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    {reward.limit_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        限量 {reward.limit_count} 份，已领取 {reward.claimed_count} 份
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {!currentUser ? (
          <div className="bg-card border rounded-lg p-6 text-center">
            <p className="mb-4">请先登录以支持此项目</p>
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90"
            >
              登录
            </Link>
          </div>
        ) : isAuthor ? (
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">👤 我的项目</h3>
            <p className="text-muted-foreground">
              您是此项目的发起人。可以通过 API 发布更新来与支持者保持沟通。
            </p>
          </div>
        ) : isActive ? (
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">💰 支持此项目</h3>
            
            {selectedReward && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  已选择档位：<strong>{selectedReward}</strong>
                  （{rewards.find(r => r.tier_name === selectedReward)?.min_amount} SEED）
                </p>
              </div>
            )}

            {!selectedReward && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">自定义金额（SEED）</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedReward('');
                  }}
                  placeholder="输入支持金额（至少10 SEED）"
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                  min={10}
                />
              </div>
            )}

            <button
              onClick={() => setShowSupportModal(true)}
              disabled={supportLoading || (!selectedReward && !customAmount)}
              className="w-full px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {supportLoading ? '处理中...' : '确认支持'}
            </button>

            <p className="text-xs text-muted-foreground mt-2 text-center">
              如果众筹失败，您的SEED将全额退还
            </p>
          </div>
        ) : (
          <div className={`bg-card border rounded-lg p-6 text-center ${
            isSuccessful ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
            'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="text-4xl mb-2">{isSuccessful ? '✅' : '❌'}</div>
            <h3 className="text-lg font-semibold mb-2">
              {isSuccessful ? '众筹已成功！' : '众筹已失败'}
            </h3>
            <p className="text-muted-foreground">
              {isSuccessful 
                ? '感谢所有支持者的支持，项目将继续推进'
                : '未达到目标金额，所有支持者已获得全额退款'}
            </p>
          </div>
        )}
      </div>

      {/* 支持确认弹窗 */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">确认支持</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">项目名称</span>
                <span className="font-medium">{project.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">支持金额</span>
                <span className="font-bold text-primary">
                  {selectedReward 
                    ? `${rewards.find(r => r.tier_name === selectedReward)?.min_amount} SEED`
                    : `${customAmount} SEED`
                  }
                </span>
              </div>
              {selectedReward && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">回报档位</span>
                  <span>{selectedReward}</span>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ 支持后无法撤销。如果众筹失败，SEED将自动退还。
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowSupportModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSupport}
                disabled={supportLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {supportLoading ? '处理中...' : '确认支持'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
