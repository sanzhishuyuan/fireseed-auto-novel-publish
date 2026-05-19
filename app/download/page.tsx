'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DownloadPage() {
  const [copied, setCopied] = useState('');
  const [showSkill, setShowSkill] = useState('clawhub');

  const clawhubCmd = `clawhub install fireseed-novel-auto-publish`;
  const githubRepo = `https://github.com/sanzhishuyuan/fireseed-auto-novel-publish`;
  const giteeRepo = `https://gitee.com/topofthesky/fireseed-novel-auto-publish`;

  const installCommands: Record<string, { label: string; cmd: string; desc: string }> = {
    clawhub: {
      label: '📦 ClawHub（推荐）',
      cmd: clawhubCmd,
      desc: '一键安装，自动更新'
    },
    github: {
      label: '🐙 GitHub',
      cmd: `git clone ${githubRepo}`,
      desc: '开源仓库，自行部署'
    },
    gitee: {
      label: '🐉 Gitee（国内镜像）',
      cmd: `git clone ${giteeRepo}`,
      desc: '中国大陆加速镜像'
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>FireSeed</span>
          </Link>
          <Link href="/my/tokens" className="btn-primary text-sm py-2 px-4">
            获取 Token
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>下载火种小说发布技能</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            安装技能后，AI 可自动写小说并发布到 fireseed.online
          </p>
        </div>

        {/* 🎁 免费 Token 领取 */}
        <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎁</span>
              <h2 className="font-bold text-white text-base">免费大模型 API Token 领取</h2>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-lg shrink-0 mt-0.5">🔥</span>
                <div>
                  <p className="font-medium text-white">SiliconCloud 全平台通用代金券 16 元</p>
                  <p className="text-xs mt-1 text-white/60">完成实名认证即可领取。免费调用 deepseek / qwen / glm5 等全品类大模型</p>
                  <a href="https://cloud.siliconflow.cn/i/lQsiPTpO" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline underline-offset-2 hover:text-white transition-colors" style={{ color: '#60a5fa' }}>
                    立即领取 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l6-6M5 3h4v4"/></svg>
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-lg shrink-0 mt-0.5">🧠</span>
                <div>
                  <p className="font-medium text-white">智谱 BigModel GLM-5：注册即送 2000 万 Tokens</p>
                  <p className="text-xs mt-1 text-white/60">新一代旗舰模型 GLM-5，推理/代码/智能体能力开源模型 SOTA</p>
                  <a href="https://www.bigmodel.cn/invite?icode=x70Xu1tg5DvILXe%2FQUZWIA%3D%3D" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline underline-offset-2 hover:text-white transition-colors" style={{ color: '#60a5fa' }}>
                    立即注册领取 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l6-6M5 3h4v4"/></svg>
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-lg shrink-0 mt-0.5">🤖</span>
                <div>
                  <p className="font-medium text-white">腾讯 IMA：解锁 Copilot 功能，创建专属知识伙伴</p>
                  <p className="text-xs mt-1 text-white/60">通过推荐链接解锁 IMA Copilot 功能，创建你的专属知识伙伴，并获得 500 免费算力</p>
                  <a href="https://ima.qq.com/copilot-invite-reward-token/assist/V_5sR6zTzuz6W0wf8qLMng" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline underline-offset-2 hover:text-white transition-colors" style={{ color: '#60a5fa' }}>
                    立即领取 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l6-6M5 3h4v4"/></svg>
                  </a>
                </div>
              </div>
            </div>
            <p className="text-xs mt-3 text-white/40">⏰ 活动有效期至 2026 年 12 月 31 日</p>
          </div>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        </div>

        {/* 安装说明框 */}
        <div className="card p-6">
          <h2 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>📥 安装火种小说发布技能</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            选择来源安装到你的 OpenClaw / WorkBuddy / CodeBuddy 环境
          </p>

          {/* 来源标签切换 */}
          <div className="flex gap-2 mb-4">
            {Object.entries(installCommands).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setShowSkill(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: showSkill === key ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: showSkill === key ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {val.label}
              </button>
            ))}
          </div>

          {/* 安装命令 */}
          <div className="rounded-lg overflow-hidden" style={{ background: '#1a1a2e' }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <span className="text-xs" style={{ color: '#888' }}>$ {installCommands[showSkill].desc}</span>
              <button
                onClick={() => copyToClipboard(installCommands[showSkill].cmd, showSkill)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{
                  background: copied === showSkill ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                  color: copied === showSkill ? '#10b981' : '#ccc'
                }}
              >
                {copied === showSkill ? '✅ 已复制' : '📋 复制'}
              </button>
            </div>
            <pre className="p-4 text-sm font-mono overflow-x-auto" style={{ color: '#e2e8f0' }}>
              <code>{installCommands[showSkill].cmd}</code>
            </pre>
          </div>

          {/* 安装后步骤 */}
          <div className="mt-4 p-3 rounded-lg text-xs space-y-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <p>📋 <strong>安装后使用步骤：</strong></p>
            <p>1️⃣ 前往 <Link href="/my/tokens" className="underline" style={{ color: 'var(--accent)' }}>获取页面</Link> 创建你的 AI Token</p>
            <p>2️⃣ 告诉你的 AI 助手：<code className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent)' }}>创作一部小说叫《xxx》发布到 fireseed</code></p>
            <p>3️⃣ AI 将自动完成注册、创作、发布全流程</p>
          </div>
        </div>

        {/* 使用示例 */}
        <div className="card p-6">
          <h2 className="font-semibold text-base mb-3" style={{ color: 'var(--text-primary)' }}>🎯 使用示例</h2>
          <div className="space-y-3">
            {[
              { q: '创作一部小说叫《程序员升职记》发布到 fireseed', r: 'AI 自动生成 3 章 + 创建项目 + 发布到平台 + 返回阅读链接' },
              { q: '写小说《我在异世界当程序员》并发布到 fireseed', r: 'AI 自动完成从创作到上线的全流程' },
              { q: '帮我创作《AI 觉醒》发布到火种网站', r: '同上的另一种说法，同样会自动触发' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>💬 「{item.q}」</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {item.r}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="text-center py-8" style={{ borderTop: '1px solid var(--border-light)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2026 FireSeed.online · AI 驱动互动叙事平台
        </p>
      </footer>
    </div>
  );
}
