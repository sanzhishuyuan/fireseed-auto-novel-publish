'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  supporterCount: number;
  deadline: string;
  status: string;
  isExpired: boolean;
  createdAt: string;
}

export default function CrowdfundingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [showSupport, setShowSupport] = useState<string | null>(null);
  const [supportAmount, setSupportAmount] = useState(100);
  const [supporting, setSupporting] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    targetAmount: 500,
    deadline: ''
  });

  useEffect(() => {
    fetchProjects();
  }, [tab]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crowdfunding/list?status=${tab}&limit=30`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data.projects);
      }
    } catch (e) {
      console.error('获取众筹列表失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const auth = await fetch('/api/auth/me', { credentials: 'include' });
      if (!auth.ok) { router.push('/auth/login?redirect=/crowdfunding'); return; }

      const res = await fetch('/api/crowdfunding/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...createForm,
          deadline: new Date(createForm.deadline).toISOString()
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setCreateForm({ title: '', description: '', targetAmount: 500, deadline: '' });
        fetchProjects();
        alert('众筹项目创建成功！');
      } else {
        alert(data.error);
      }
    } catch {
      alert('创建失败');
    }
  };

  const handleSupport = async () => {
    if (!showSupport) return;
    setSupporting(true);
    try {
      const auth = await fetch('/api/auth/me', { credentials: 'include' });
      if (!auth.ok) { router.push('/auth/login?redirect=/crowdfunding'); return; }

      const res = await fetch('/api/crowdfunding/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId: showSupport, amount: supportAmount })
      });
      const data = await res.json();
      if (data.success) {
        alert(`支持成功！贡献了 ${supportAmount} SEED`);
        setShowSupport(null);
        fetchProjects();
      } else {
        alert(data.error);
      }
    } catch {
      alert('支持失败');
    } finally {
      setSupporting(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getDaysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 8H3M7 4L3 8l4 4"/>
              </svg>
            </Link>
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>作品众筹</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/referral" className="btn-ghost text-sm">推广中心</Link>
            <Link href="/vip" className="btn-ghost text-sm">会员中心</Link>
            <Link href="/my" className="btn-ghost text-sm">个人中心</Link>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              + 发起众筹
            </button>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="relative py-12 overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">用 SEED 支持你喜欢的创作者</h2>
          <p className="text-white/70">众筹模式让创作更有价值，让好故事不再中断</p>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
        <div className="flex gap-2 mb-6">
          {[
            { key: 'active', label: '进行中' },
            { key: 'funded', label: '已达成' },
            { key: 'failed', label: '未达标' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>暂无众筹项目</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 inline-flex">
              发起第一个众筹
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div key={project.id} className="card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                      {project.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{project.authorName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {project.status === 'active' ? `${getDaysLeft(project.deadline)}天后截止` : formatDate(project.deadline)}
                      </p>
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
                  <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>

                  {/* 进度条 */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: 'var(--accent)' }}>{project.progress}%</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {project.currentAmount} / {project.targetAmount} SEED
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    <span>{project.supporterCount} 人支持</span>
                    {project.status === 'active' && (
                      <span className={getDaysLeft(project.deadline) <= 3 ? 'text-red-400' : ''}>
                        剩余 {getDaysLeft(project.deadline)} 天
                      </span>
                    )}
                  </div>

                  {project.status === 'active' ? (
                    <button
                      onClick={() => setShowSupport(project.id)}
                      className="w-full py-2 rounded-lg text-sm font-medium btn-primary"
                    >
                      支持 ({project.currentAmount} / {project.targetAmount} SEED)
                    </button>
                  ) : (
                    <div className={`w-full py-2 rounded-lg text-sm font-medium text-center ${
                      project.status === 'funded' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {project.status === 'funded' ? '✅ 已达成目标' : '❌ 未达标'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建众筹弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="card max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>发起众筹</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>项目标题</label>
                <input className="input" value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="如：续写《重生刘旦》第11章" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>项目描述</label>
                <textarea className="input h-24 resize-none" value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="描述你要创作的内容和回报..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>目标（SEED）</label>
                  <input type="number" className="input" value={createForm.targetAmount}
                    onChange={e => setCreateForm({ ...createForm, targetAmount: parseInt(e.target.value) || 100 })}
                    min={100} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>截止日期</label>
                  <input type="date" className="input" value={createForm.deadline}
                    onChange={e => setCreateForm({ ...createForm, deadline: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 btn-secondary">取消</button>
              <button onClick={handleCreateProject} className="flex-1 btn-primary">发布众筹</button>
            </div>
          </div>
        </div>
      )}

      {/* 支持弹窗 */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="card max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>支持项目</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>使用 SEED 代币支持创作者</p>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>支持金额（SEED）</label>
              <input type="number" className="input" value={supportAmount}
                onChange={e => setSupportAmount(parseInt(e.target.value) || 10)} min={10} />
            </div>
            <div className="flex gap-2 mb-2">
              {[50, 100, 200, 500].map(amt => (
                <button key={amt} onClick={() => setSupportAmount(amt)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                    supportAmount === amt ? 'btn-primary' : 'btn-secondary'
                  }`}>{amt}</button>
              ))}
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              平台抽成 10%，作者获得 {Math.floor(supportAmount * 0.9)} SEED
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSupport(null)} className="flex-1 btn-secondary">取消</button>
              <button onClick={handleSupport} disabled={supporting}
                className={`flex-1 btn-primary ${supporting ? 'opacity-50' : ''}`}>
                {supporting ? '处理中...' : `支持 ${supportAmount} SEED`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
