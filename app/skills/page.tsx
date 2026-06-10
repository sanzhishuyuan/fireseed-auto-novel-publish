'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SkillItem {
  id: string;
  name: string;
  title: string;
  description: string;
  author: string;
  icon_emoji: string;
  tags: string;
  repo_url: string;
  repo_type: string;
  skill_version: string;
  download_count: number;
  star_count: number;
  sort_order: number;
}

interface Stats {
  total: number;
  total_downloads: number;
  total_authors: number;
}

const INSTALL_CMD = 'npx clawhub install fireseed-novel-auto-publish';

export default function SkillsPage() {
  const [items, setItems] = useState<SkillItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, total_downloads: 0, total_authors: 0 });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('hot');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/skills?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setStats(data.stats);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSkills(); }, [sort]);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {}
  };

  const tagColors: Record<string, string> = {
    '写作': '#8b5cf6', '工具': '#3b82f6', '运营': '#10b981', '阅读': '#f59e0b', '开发': '#ef4444',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-10 text-center">
        <div className="absolute inset-0 opacity-15" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-glow), transparent)' }} />
        <div className="relative max-w-4xl mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            🔥 技能排行榜
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            发现优秀的 AI 技能，为你的 AI 助手扩展能力
          </p>

          {/* 统计 */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center"><div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{stats.total}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>技能</div></div>
            <div className="text-center"><div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{stats.total_downloads}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>总下载</div></div>
            <div className="text-center"><div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{stats.total_authors}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>开发者</div></div>
          </div>

          {/* 搜索 + 排序 */}
          <div className="flex items-center gap-3 max-w-xl mx-auto">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchSkills()} className="input flex-1 text-sm" placeholder="搜索技能名称、作者..." />
            <button onClick={fetchSkills} className="btn-primary text-sm px-4 py-2">搜索</button>
            <select value={sort} onChange={e => setSort(e.target.value)} className="input w-auto text-sm">
              <option value="hot">🔥 热度</option>
              <option value="downloads">⬇️ 下载</option>
              <option value="newest">🆕 最新</option>
            </select>
          </div>
        </div>
      </section>

      {/* 排行榜列表 */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="card p-12 text-center"><div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div><p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</p></div>
        ) : items.length === 0 ? (
          <div className="card p-12 text-center"><p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>📭</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>{search ? '没有匹配的技能' : '排行榜暂无数据'}</p></div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="card p-4 flex items-start gap-4 hover:scale-[1.01] transition-transform">
                {/* 排名 */}
                <div className="w-8 shrink-0 text-center pt-1">
                  <span className={`text-lg font-bold ${idx < 3 ? '' : ''}`} style={{ color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : 'var(--text-muted)' }}>
                    #{idx + 1}
                  </span>
                </div>

                {/* 图标 */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'var(--bg-secondary)' }}>
                  {item.icon_emoji}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                    {item.skill_version && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>v{item.skill_version}</span>}
                  </div>
                  {item.description && <p className="text-xs mb-1 truncate" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>}
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>👤 {item.author}</span>
                    <span>⭐ {item.download_count}</span>
                    {item.tags && item.tags.split(',').filter(Boolean).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: `${tagColors[t.trim()] || '#64748b'}18`, color: tagColors[t.trim()] || '#64748b' }}>
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.repo_url?.includes('github') && (
                    <a href={item.repo_url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs px-2.5 py-1.5">
                      GitHub
                    </a>
                  )}
                  {item.repo_url?.includes('gitee') && (
                    <a href={item.repo_url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs px-2.5 py-1.5">
                      Gitee
                    </a>
                  )}
                  <button
                    onClick={() => copyText(`npx clawhub install ${item.name}`, item.id)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {copiedId === item.id ? '✅ 已复制' : '安装'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== 安装指南（原/download内容整合） ===== */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <details className="card overflow-hidden">
          <summary className="p-4 cursor-pointer font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            📖 如何安装技能？—— 详细指南
          </summary>
          <div className="px-4 pb-4 space-y-4 text-sm" style={{ borderTop: '1px solid var(--border-light)' }}>
            {/* ClawHub 安装 */}
            <div className="mt-4">
              <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>ClawHub 命令行安装</h4>
              <div className="relative rounded-lg p-3 font-mono text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--accent)' }}
                onClick={() => copyText(INSTALL_CMD, 'install-guide')}>
                {INSTALL_CMD}
                <button className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-xs"
                  style={{ background: copiedId === 'install-guide' ? 'rgba(16,185,129,0.15)' : 'var(--bg-card)', color: copiedId === 'install-guide' ? '#10b981' : 'var(--text-muted)' }}
                  onClick={(e) => { e.stopPropagation(); copyText(INSTALL_CMD, 'install-guide'); }}>
                  {copiedId === 'install-guide' ? '✅ 已复制' : '📋 复制'}
                </button>
              </div>
            </div>

            {/* Git Clone */}
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Gitee 克隆', cmd: 'git clone https://gitee.com/topofthesky/ai-novel-skill.git', link: 'https://gitee.com/topofthesky/ai-novel-skill', linkText: 'Gitee →' },
                { label: 'GitHub 克隆', cmd: 'git clone https://github.com/sanzhishuyuan/fireseed-auto-novel-publish.git', link: 'https://github.com/sanzhishuyuan/fireseed-auto-novel-publish', linkText: 'GitHub →' },
              ].map((m) => (
                <div key={m.label} className="rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="font-medium text-xs mb-2" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
                  <div className="relative rounded p-2 font-mono text-xs mb-2 cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
                    onClick={() => copyText(m.cmd, m.label)}>
                    {m.cmd}
                  </div>
                  <a href={m.link} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'var(--accent)' }}>{m.linkText}</a>
                </div>
              ))}
            </div>

            {/* 手动安装提示 */}
            <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              💡 <strong>手动安装</strong>：克隆后将 SKILL.md 放入 AI 工具的 skills 目录（WorkBuddy → <code style={{ color: 'var(--accent)' }}>.workbuddy/skills/</code>，OpenClaw → 面板导入）。
            </div>

            {/* 快速开始 3 步 */}
            <div>
              <h4 className="font-medium mb-3 text-center" style={{ color: 'var(--text-primary)' }}>🚀 快速开始，只需 3 步</h4>
              <div className="grid sm:grid-cols-3 gap-3 text-center text-xs">
                {[
                  { num: '01', emoji: '📝', title: '注册账号', desc: '打开 fireseed.online 注册' },
                  { num: '02', emoji: '📦', title: '安装技能', desc: '选择上方安装方式安装' },
                  { num: '03', emoji: '🤖', title: '给 AI 发指令', desc: '告诉 AI "创作一部小说" 即可' },
                ].map(s => (
                  <div key={s.num} className="p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <div className="text-2xl mb-1">{s.emoji}</div>
                    <div className="w-6 h-6 rounded flex items-center justify-center mx-auto mb-1 text-xs font-bold" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>{s.num}</div>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                  </div>
                ))}
              </div>
              <div className="text-center mt-4">
                <Link href="/auth/register" className="btn-primary text-xs px-5 py-2">立即注册 →</Link>
              </div>
            </div>
          </div>
        </details>
      </section>

      {/* Footer */}
      <footer className="pb-6 pt-4 text-center" style={{ borderTop: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-center gap-4 mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Link href="/">首页</Link>
          <Link href="/novels">作品</Link>
          <Link href="/feedback">反馈</Link>
          <Link href="/download">旧版下载</Link>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2026 FireSeed.online</p>
      </footer>
    </div>
  );
}
