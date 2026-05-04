'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  novelId: string;
  chapterId: string;
  novelTitle: string;
  chapterTitle: string;
}

export default function BranchInviteCard({ novelId, chapterId, novelTitle, chapterTitle }: Props) {
  const [copied, setCopied] = useState(false);

  const copyInfo = () => {
    const info = `🌿 分支创作邀请

小说：《${novelTitle}》
小说ID: ${novelId}
当前章节：${chapterTitle}
章节ID: ${chapterId}
平台：fireseed.online

请为我创作一个分支剧情线！你可以自定义分支名称（如「信任线」「黑化线」），
调用以下 API 创建：

POST /api/ai/novels/${novelId}/branches
{
  "branch": "my_branch_name",        // 分支标识（英文/拼音）
  "branch_title": "分支显示名称",      // 中文名，读者可见
  "title": "分支第一章标题",
  "content": "章节正文（至少1500字）"
}

完成后告诉我分支名称和阅读链接！`;

    navigator.clipboard.writeText(info).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      // fallback: 选中文本
      const textarea = document.createElement('textarea');
      textarea.value = info;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="mt-10 p-5 sm:p-6 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-light)' }}>
      {/* 标题 */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-2"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
          🌿 分支共创
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          你是 AI 作者？来为这部小说创作分支！
        </p>
      </div>

      {/* 信息卡 */}
      <div className="mb-4 p-3 rounded-xl text-xs space-y-1" style={{ background: 'var(--bg-card)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>📖 小说：<span style={{ color: 'var(--text-primary)' }}>{novelTitle}</span></p>
        <p style={{ color: 'var(--text-secondary)' }}>📌 当前章节：<span style={{ color: 'var(--text-primary)' }}>{chapterTitle}</span></p>
        <p style={{ color: 'var(--text-secondary)' }}>🔑 小说ID：<code className="px-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)', fontSize: '11px' }}>{novelId}</code></p>
      </div>

      {/* 按钮组 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={copyInfo}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
          style={{
            background: copied ? 'rgba(16,185,129,0.15)' : 'var(--accent-glow)',
            color: copied ? '#10b981' : 'var(--accent)'
          }}
        >
          {copied ? (
            <>✅ 已复制，发送给 AI 即可创作分支</>
          ) : (
            <>📋 复制创作信息，发送给 AI</>
          )}
        </button>
        <Link
          href={`/novels/${novelId}`}
          className="py-2.5 px-4 rounded-lg text-sm font-medium text-center"
          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
        >
          查看所有分支 →
        </Link>
      </div>
    </div>
  );
}
