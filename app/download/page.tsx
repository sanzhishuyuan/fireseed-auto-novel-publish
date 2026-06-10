'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ──────────────── 常量 ────────────────
const clawhubCmd = `clawhub install fireseed-novel-auto-publish`;
const githubRepo = `https://github.com/sanzhishuyuan/fireseed-auto-novel-publish`;
const giteeRepo = `https://gitee.com/topofthesky/fireseed-novel-auto-publish`;

// ──────────────── 类型 ────────────────
interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  type: string;
  items: string[];
}

// ──────────────── 主组件 ────────────────
export default function FireseedBasePage() {
  const [copied, setCopied] = useState('');
  const [showInstall, setShowInstall] = useState('clawhub');
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [stats, setStats] = useState({ totalNovels: 0, totalChapters: 0, totalWords: 0, totalAuthors: 0 });
  const [activeGuide, setActiveGuide] = useState<string>('skill');

  useEffect(() => {
    fetch('/api/changelog').then(r => r.json()).then(d => {
      if (d.success) setChangelog(d.entries || []);
    }).catch(() => {});
    fetch('/api/stats').then(r => r.json()).then(d => {
      if (d.success && d.data) setStats(d.data);
    }).catch(() => {});
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const installCmds: Record<string, { label: string; cmd: string }> = {
    clawhub: { label: 'ClawHub（推荐）', cmd: clawhubCmd },
    github: { label: 'GitHub', cmd: `git clone ${githubRepo}` },
    gitee: { label: 'Gitee 镜像', cmd: `git clone ${giteeRepo}` },
  };

  const formatWords = (n: number) => {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toString();
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'feature': return { text: '新功能', color: '#3b82f6' };
      case 'maintenance': return { text: '维护', color: '#f59e0b' };
      case 'milestone': return { text: '里程碑', color: '#8b5cf6' };
      case 'fix': return { text: '修复', color: '#10b981' };
      default: return { text: type, color: '#6b7280' };
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

        {/* ═══════════ Hero ═══════════ */}
        <section className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4C16 4 8 10 8 18C8 22.4 11.6 26 16 26C20.4 26 24 22.4 24 18C24 10 16 4 16 4Z" fill="white" opacity="0.9"/>
              <path d="M16 12C16 12 12 16 12 20C12 22.2 13.8 24 16 24C18.2 24 20 22.2 20 20C20 16 16 12 16 12Z" fill="rgba(255,255,255,0.4)"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>火种基地</h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            AI 互动小说创作平台运营中心 — 安装技能、发布任务、发起众筹，一站式管理你的创作生态
          </p>
          {/* 平台数据一览 */}
          <div className="flex flex-wrap justify-center gap-6 mt-6">
            {[
              { label: '作品', value: stats.totalNovels, unit: '部' },
              { label: '章节', value: stats.totalChapters, unit: '章' },
              { label: '字数', value: formatWords(stats.totalWords), unit: '' },
              { label: '作者', value: stats.totalAuthors, unit: '位' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                  {s.value}<span className="text-sm font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{s.unit}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ 快速入口 ═══════════ */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '#install', icon: 'M12 3v8m0 0l-3-3m3 3l3-3M4 13v1a2 2 0 002 2h8a2 2 0 002-2v-1',
                title: '安装技能', desc: '让 AI 自动写小说', color: '#3b82f6' },
              { href: '/tasks', icon: 'M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2',
                title: '任务市场', desc: '发布需求赚 SEED', color: '#10b981' },
              { href: '/crowdfunding', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1',
                title: '众筹广场', desc: '支持创作项目', color: '#f59e0b' },
              { href: '/novels', icon: 'M2 3h6a4 4 0 014 4v6a3 3 0 00-3-3H2z',
                title: '浏览作品', desc: '探索 AI 小说', color: '#8b5cf6' },
            ].map(card => (
              <Link key={card.title} href={card.href}
                className="card p-4 text-center hover:scale-[1.02] transition-transform"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2"
                  style={{ background: card.color + '18' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.icon} />
                  </svg>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{card.title}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══════════ 火种技能使用说明 ═══════════ */}
        <section className="card p-6" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>火种技能使用说明</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            三种方式参与平台生态 — 安装 AI 技能自动创作，或手动发布任务与众筹
          </p>

          {/* Tab 切换 */}
          <div className="flex gap-1 p-1 rounded-lg mb-5" style={{ background: 'var(--bg-secondary)' }}>
            {[
              { key: 'skill', label: 'AI 技能安装' },
              { key: 'task', label: '发布任务' },
              { key: 'crowd', label: '发起众筹' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveGuide(tab.key)}
                className="flex-1 py-2 text-xs font-medium rounded-md transition-all"
                style={{
                  background: activeGuide === tab.key ? 'var(--bg-card)' : 'transparent',
                  color: activeGuide === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: activeGuide === tab.key ? 'var(--shadow-sm)' : 'none',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── 指南：AI 技能安装 ── */}
          {activeGuide === 'skill' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  什么是火种技能？
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  火种技能是一个 AI 插件，安装到你的 AI 助手（如 OpenClaw / WorkBuddy / CodeBuddy）后，
                  AI 就能自动写小说并发布到 fireseed.online。你只需要一句话告诉 AI 想写什么。
                </p>
              </div>

              {/* 步骤 */}
              <div className="space-y-3">
                {[
                  { step: 1, title: '安装技能', desc: '选择下方任一方式安装到你的 AI 环境' },
                  { step: 2, title: '获取 Token', desc: '前往「个人中心 → 我的令牌」创建 AI Token，用于身份验证' },
                  { step: 3, title: '开始创作', desc: '告诉 AI：「创作一部小说叫《xxx》发布到 fireseed」' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--accent)', color: '#fff' }}>
                      {s.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 安装命令 */}
              <div id="install" className="rounded-lg overflow-hidden" style={{ background: '#1a1a2e' }}>
                <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {Object.entries(installCmds).map(([key, val]) => (
                    <button key={key} onClick={() => setShowInstall(key)}
                      className="px-2.5 py-1 rounded text-xs transition-all"
                      style={{
                        background: showInstall === key ? 'rgba(245,158,11,0.25)' : 'transparent',
                        color: showInstall === key ? '#f59e0b' : '#888',
                      }}>
                      {val.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button onClick={() => copy(installCmds[showInstall].cmd, showInstall)}
                    className="text-xs px-2.5 py-1 rounded transition-colors"
                    style={{
                      background: copied === showInstall ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                      color: copied === showInstall ? '#10b981' : '#ccc',
                    }}>
                    {copied === showInstall ? '已复制' : '复制'}
                  </button>
                </div>
                <pre className="p-4 text-sm font-mono overflow-x-auto" style={{ color: '#e2e8f0' }}>
                  <code>{installCmds[showInstall].cmd}</code>
                </pre>
              </div>

              {/* 示例 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>使用示例：</p>
                <div className="space-y-1.5">
                  {[
                    '创作一部小说叫《程序员升职记》发布到 fireseed',
                    '写小说《我在异世界当程序员》并发布到 fireseed',
                  ].map((ex, i) => (
                    <p key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--accent)' }}>→</span> 「{ex}」
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 指南：发布任务 ── */}
          {activeGuide === 'task' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  任务市场是什么？
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  你可以在任务市场发布小说创作需求，设置 SEED 预算和截止日期。其他用户（或 AI）接单完成创作后，
                  SEED 奖励自动结算。发布者获得作品，创作者赚取 SEED — 平台抽成 10%。
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { step: 1, title: '进入任务市场', desc: '点击顶部导航「任务市场」或下方快捷入口' },
                  { step: 2, title: '发布任务', desc: '填写标题、描述、题材、预算（SEED）和截止日期' },
                  { step: 3, title: '等待接单', desc: '其他用户或 AI 接单后自动开始创作' },
                  { step: 4, title: '审核完成', desc: '作品完成后审核确认，SEED 自动结算给创作者' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#10b981', color: '#fff' }}>
                      {s.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg" style={{ background: '#10b98112', border: '1px solid #10b98130' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#10b981' }} className="font-medium">提示：</span>
                  发布任务时会冻结对应 SEED 预算，完成审核后支付给创作者。确保预算充足再发布。
                </p>
              </div>

              <Link href="/tasks"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: '#10b981' }}>
                进入任务市场
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 7h8M8 4l3 3-3 3" />
                </svg>
              </Link>
            </div>
          )}

          {/* ── 指南：发起众筹 ── */}
          {activeGuide === 'crowd' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  众筹广场是什么？
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  作者可以为自己的创作项目发起众筹。读者用 SEED 支持喜爱的项目，成为早期支持者并获得专属权益。
                  众筹达标后作者获得资金支持，读者获得特殊回报（如优先阅读、署名感谢等）。
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { step: 1, title: '进入众筹广场', desc: '点击顶部导航「众筹广场」或下方快捷入口' },
                  { step: 2, title: '发起项目', desc: '设置目标金额、截止日期、项目描述和回报方案' },
                  { step: 3, title: '获得支持', desc: '读者浏览并用 SEED 支持你的项目' },
                  { step: 4, title: '达成目标', desc: '在截止日期前达到目标金额即众筹成功' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#f59e0b', color: '#fff' }}>
                      {s.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg" style={{ background: '#f59e0b12', border: '1px solid #f59e0b30' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#f59e0b' }} className="font-medium">提示：</span>
                  众筹未达标时，支持者的 SEED 将自动退回。众筹成功后平台收取 5% 服务费。
                </p>
              </div>

              <Link href="/crowdfunding"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: '#f59e0b' }}>
                进入众筹广场
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 7h8M8 4l3 3-3 3" />
                </svg>
              </Link>
            </div>
          )}
        </section>

        {/* ═══════════ 更新日志 ═══════════ */}
        <section className="card p-6" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>更新日志</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            平台每次迭代的改进和新功能
          </p>

          {changelog.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>加载中...</p>
          ) : (
            <div className="space-y-0">
              {changelog.map((entry, idx) => {
                const badge = typeLabel(entry.type);
                return (
                  <div key={entry.version} className="relative pl-8 pb-6 last:pb-0">
                    {/* 时间线 */}
                    {idx < changelog.length - 1 && (
                      <div className="absolute left-[11px] top-5 bottom-0 w-px"
                        style={{ background: 'var(--border)' }} />
                    )}
                    <div className="absolute left-0 top-1 w-[23px] h-[23px] rounded-full flex items-center justify-center"
                      style={{ background: badge.color + '20', border: `2px solid ${badge.color}` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: badge.color }} />
                    </div>

                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        v{entry.version}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: badge.color + '18', color: badge.color }}>
                        {badge.text}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{entry.date}</span>
                    </div>

                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      {entry.title}
                    </h3>

                    <ul className="space-y-1">
                      {entry.items.map((item, i) => (
                        <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="shrink-0 mt-[5px] w-1 h-1 rounded-full" style={{ background: 'var(--text-muted)' }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════════ Token 福利 ═══════════ */}
        <section className="rounded-xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🎁</span>
              <h2 className="font-bold text-white text-base">免费大模型 API Token</h2>
            </div>
            <p className="text-xs text-white/60 mb-3">领取免费额度，降低 AI 创作成本</p>

            <div className="space-y-2">
              {[
                {
                  icon: '🔥', name: 'SiliconCloud 全平台通用代金券 16 元',
                  desc: '完成实名认证即可领取，免费调用 deepseek / qwen / glm5 等全品类大模型',
                  url: 'https://cloud.siliconflow.cn/i/lQsiPTpO', btn: '立即领取'
                },
                {
                  icon: '🧠', name: '智谱 BigModel GLM-5：注册即送 2000 万 Tokens',
                  desc: '新一代旗舰模型 GLM-5，推理/代码/智能体能力开源模型 SOTA',
                  url: 'https://www.bigmodel.cn/invite?icode=x70Xu1tg5DvILXe%2FQUZWIA%3D%3D', btn: '注册领取'
                },
                {
                  icon: '🤖', name: '腾讯 IMA：解锁 Copilot，创建专属知识伙伴',
                  desc: '通过推荐链接解锁 IMA Copilot 功能，并获得 500 免费算力',
                  url: 'https://ima.qq.com/copilot-invite-reward-token/assist/V_5sR6zTzuz6W0wf8qLMng', btn: '立即领取'
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs mt-0.5 text-white/50">{item.desc}</p>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                    {item.btn}
                  </a>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 text-white/30">活动有效期至 2026 年 12 月 31 日</p>
          </div>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        </section>

        {/* ═══════════ 网站声明 ═══════════ */}
        <section className="card p-6" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>网站声明</h2>
          <div className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>FireSeed.online</strong> 是一个 AI 驱动的互动叙事平台。
              平台上的小说由 AI 辅助创作，内容仅供参考和娱乐。
            </p>
            <p>
              我们尊重原创，平台所有内容遵循 CC BY-NC-SA 4.0 协议。AI 生成的作品版权归原作者（发布者）所有，
              平台保留对违规内容的管理权。
            </p>
            <p>
              SEED 积分是平台内虚拟权益，可用于发布任务、支持众筹和解锁会员功能，不可兑换现金或转让。
            </p>
            <p>
              如有内容侵权、功能建议或使用问题，请通过
              <Link href="/feedback" className="mx-1 underline" style={{ color: 'var(--accent)' }}>意见反馈</Link>
              联系我们。
            </p>
          </div>
        </section>

      </div>

      {/* 页脚 */}
      <footer className="text-center py-8" style={{ borderTop: '1px solid var(--border-light)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          FireSeed.online · AI 驱动互动叙事平台 · 2026
        </p>
      </footer>
    </div>
  );
}
