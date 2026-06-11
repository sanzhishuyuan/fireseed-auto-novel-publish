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
        const payload = (data as any).data || data;
        setProject(payload.project || null);
        setRewards(payload.rewards || []);
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
        const payload = (data as any).data || data;
        alert(payload.message || '支持成功！');
        setShowSupportModal(false);
        setSelectedReward('');
        setCustomAmount('');
        loadProject(); // 刷新项目进度
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || JSON.stringify(data.error);
        alert(`支持失败: ${errMsg}`);
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
      <>
        <div className="codex-bg" />
        <div className="codex-shell" style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="codex-skeleton" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px' }} />
              <p className="codex-mono" style={{ fontSize: 13, color: '#9a9a8e' }}>加载中...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <div className="codex-bg" />
        <div className="codex-shell" style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
              <h2 className="codex-display" style={{ fontSize: 20, fontWeight: 700, color: '#f0ece4', marginBottom: 12 }}>
                项目不存在
              </h2>
              <Link href="/crowdfunding" style={{ color: '#c9a55c', textDecoration: 'underline', fontSize: 14 }}>
                返回众筹广场
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isAuthor = currentUser?.id === project.author_id;
  const isActive = project.status === 'active';
  const isSuccessful = project.status === 'successful';
  const isFailed = project.status === 'failed';

  return (
    <>
      <div className="codex-bg" />
      <div className="codex-shell" style={{ paddingTop: 48, paddingBottom: 48 }}>
        {/* 返回按钮 */}
        <Link href="/crowdfunding" className="codex-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9a9a8e', textDecoration: 'none', marginBottom: 24 }}>
          ← 返回众筹广场
        </Link>

        {/* 项目头部 */}
        <div className="codex-card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <h1 className="codex-display" style={{ fontSize: 28, fontWeight: 700, color: '#f0ece4' }}>
                {project.title}
              </h1>
              <span className={`codex-badge ${isSuccessful ? 'codex-badge-green' : isFailed ? 'codex-badge-red' : 'codex-badge-blue'}`}>
                {isSuccessful ? '已成功' : isFailed ? '已失败' : '进行中'}
              </span>
            </div>
            
            <div className="codex-mono" style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#9a9a8e' }}>
              <span>👤 {project.author_name}</span>
              <span>📅 {formatDate(project.deadline)}</span>
              {project.days_left !== undefined && (
                <span style={project.days_left <= 3 ? { color: '#ef4444', fontWeight: 600 } : {}}>
                  ⏰ 剩余 {project.days_left} 天
                </span>
              )}
            </div>
          </div>

          {/* 进度条 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ fontWeight: 500, color: '#f0ece4' }}>筹集进度</span>
              <span className="codex-mono" style={{ fontWeight: 700, color: '#c9a55c' }}>
                {project.progress_percentage || 0}%
              </span>
            </div>
            <div className="codex-progress" style={{ height: 12 }}>
              <div
                className={`codex-progress-bar ${isSuccessful ? 'codex-progress-bar-green' : ''}`}
                style={{
                  width: `${Math.min(project.progress_percentage || 0, 100)}%`,
                  background: isFailed ? '#ef4444' : undefined
                }}
              />
            </div>
          </div>

          {/* 统计信息 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, background: '#1a1a22', borderRadius: 10 }}>
              <div className="codex-stat-num">{project.current_amount}</div>
              <div className="codex-stat-label" style={{ marginTop: 6 }}>已筹集 SEED</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: '#1a1a22', borderRadius: 10 }}>
              <div className="codex-stat-num">{project.target_amount}</div>
              <div className="codex-stat-label" style={{ marginTop: 6 }}>目标 SEED</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: '#1a1a22', borderRadius: 10 }}>
              <div className="codex-stat-num">{project.supporter_count}</div>
              <div className="codex-stat-label" style={{ marginTop: 6 }}>支持者</div>
            </div>
          </div>
        </div>

        {/* 项目描述 */}
        <div className="codex-card" style={{ padding: 28, marginBottom: 24 }}>
          <h2 className="codex-section-title">📖 项目介绍</h2>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: '#f0ece4' }}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{project.description}</p>
          </div>
        </div>

        {/* 回报档位 */}
        {rewards.length > 0 && isActive && (
          <div className="codex-card" style={{ padding: 28, marginBottom: 24 }}>
            <h2 className="codex-section-title">🎁 回报档位</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {rewards.map((reward) => {
                const benefits = parseBenefits(reward.benefits);
                const isSoldOut = reward.limit_count > 0 && reward.claimed_count >= reward.limit_count;
                
                return (
                  <div
                    key={reward.id}
                    className="codex-card"
                    style={{
                      padding: 20,
                      opacity: isSoldOut ? 0.5 : 1,
                      cursor: isSoldOut ? 'not-allowed' : 'pointer',
                      border: selectedReward === reward.tier_name ? '1px solid #c9a55c' : undefined
                    }}
                    onClick={() => !isSoldOut && setSelectedReward(reward.tier_name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f0ece4' }}>{reward.tier_name}</h3>
                      {isSoldOut && (
                        <span className="codex-badge codex-badge-gray" style={{ fontSize: 11 }}>
                          已售罄
                        </span>
                      )}
                    </div>
                    
                    <div className="codex-mono" style={{ fontSize: 24, fontWeight: 700, color: '#c9a55c', marginBottom: 12 }}>
                      {reward.min_amount} SEED
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                      {benefits.map((benefit, idx) => (
                        <li key={idx} style={{ fontSize: 13, color: '#9a9a8e', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ color: '#c9a55c' }}>✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    {reward.limit_count > 0 && (
                      <div className="codex-mono" style={{ fontSize: 11, color: '#5a5a52' }}>
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
          <div className="codex-card" style={{ padding: 28, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#9a9a8e', marginBottom: 16 }}>请先登录以支持此项目</p>
            <Link href="/auth/login" className="codex-btn codex-btn-gold" style={{ textDecoration: 'none' }}>
              登录
            </Link>
          </div>
        ) : isAuthor ? (
          <div className="codex-card" style={{ padding: 28 }}>
            <h3 className="codex-section-title">👤 我的项目</h3>
            <p style={{ fontSize: 14, color: '#9a9a8e', lineHeight: 1.6 }}>
              您是此项目的发起人。可以通过 API 发布更新来与支持者保持沟通。
            </p>
          </div>
        ) : isActive ? (
          <div className="codex-card" style={{ padding: 28 }}>
            <h3 className="codex-section-title">💰 支持此项目</h3>
            
            {selectedReward && (
              <div className="codex-tip codex-tip-info" style={{ marginBottom: 16 }}>
                已选择档位：<strong style={{ color: '#f0ece4' }}>{selectedReward}</strong>
                （{rewards.find(r => r.tier_name === selectedReward)?.min_amount} SEED）
              </div>
            )}

            {!selectedReward && (
              <div style={{ marginBottom: 16 }}>
                <label className="codex-mono" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9a9a8e', marginBottom: 8 }}>
                  自定义金额（SEED）
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedReward('');
                  }}
                  placeholder="输入支持金额（至少10 SEED）"
                  className="codex-input"
                  min={10}
                />
              </div>
            )}

            <button
              onClick={() => setShowSupportModal(true)}
              disabled={supportLoading || (!selectedReward && !customAmount)}
              className="codex-btn codex-btn-gold"
              style={{ width: '100%', opacity: (supportLoading || (!selectedReward && !customAmount)) ? 0.5 : 1 }}
            >
              {supportLoading ? '处理中...' : '确认支持'}
            </button>

            <p className="codex-mono" style={{ fontSize: 11, color: '#5a5a52', marginTop: 10, textAlign: 'center' }}>
              如果众筹失败，您的SEED将全额退还
            </p>
          </div>
        ) : (
          <div className="codex-card" style={{
            padding: 28,
            textAlign: 'center',
            background: isSuccessful ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
            borderColor: isSuccessful ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{isSuccessful ? '✅' : '❌'}</div>
            <h3 className="codex-display" style={{ fontSize: 18, fontWeight: 700, color: '#f0ece4', marginBottom: 8 }}>
              {isSuccessful ? '众筹已成功！' : '众筹已失败'}
            </h3>
            <p style={{ fontSize: 14, color: '#9a9a8e', lineHeight: 1.6 }}>
              {isSuccessful 
                ? '感谢所有支持者的支持，项目将继续推进'
                : '未达到目标金额，所有支持者已获得全额退款'}
            </p>
          </div>
        )}
      </div>

      {/* 支持确认弹窗 */}
      {showSupportModal && (
        <div className="codex-modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="codex-modal" onClick={e => e.stopPropagation()}>
            <div className="codex-modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f0ece4' }}>确认支持</h3>
            </div>
            
            <div className="codex-modal-body">
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: '#9a9a8e', fontSize: 14 }}>项目名称</span>
                  <span style={{ fontWeight: 500, color: '#f0ece4', fontSize: 14 }}>{project.title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: '#9a9a8e', fontSize: 14 }}>支持金额</span>
                  <span className="codex-mono" style={{ fontWeight: 700, color: '#c9a55c', fontSize: 14 }}>
                    {selectedReward 
                      ? `${rewards.find(r => r.tier_name === selectedReward)?.min_amount} SEED`
                      : `${customAmount} SEED`
                    }
                  </span>
                </div>
                {selectedReward && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9a9a8e', fontSize: 14 }}>回报档位</span>
                    <span style={{ color: '#f0ece4', fontSize: 14 }}>{selectedReward}</span>
                  </div>
                )}
              </div>

              <div className="codex-tip codex-tip-warn">
                ⚠️ 支持后无法撤销。如果众筹失败，SEED将自动退还。
              </div>
            </div>

            <div className="codex-modal-footer">
              <button onClick={() => setShowSupportModal(false)} className="codex-btn codex-btn-ghost" style={{ flex: 1 }}>
                取消
              </button>
              <button
                onClick={handleSupport}
                disabled={supportLoading}
                className="codex-btn codex-btn-gold"
                style={{ flex: 1, opacity: supportLoading ? 0.5 : 1 }}
              >
                {supportLoading ? '处理中...' : '确认支持'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
