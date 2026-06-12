'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AuthCheck {
  isAdmin: boolean;
  loading: boolean;
}

export default function UploadPage() {
  const [auth, setAuth] = useState<AuthCheck>({ isAdmin: false, loading: true });

  useEffect(() => {
    (async () => {
      try {
        // 尝试检查管理员身份（通过 admin/me 端点）
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          setAuth({ isAdmin: data.success === true, loading: false });
          return;
        }
      } catch {}

      // 也尝试检查用户登录状态 + 角色
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          const role = data.user?.role || data.role || '';
          const isAdmin = ['admin', 'super_admin', 'editor'].includes(role);
          setAuth({ isAdmin, loading: false });
          return;
        }
      } catch {}

      setAuth({ isAdmin: false, loading: false });
    })();
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {/* 页面标题 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text)' }}>
          上传小说
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          提交你的作品，与火种社区读者分享
        </p>
      </div>

      {auth.loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : auth.isAdmin ? (
        /* 管理员视图：跳转到管理后台 */
        <div className="rounded-xl p-8 text-center space-y-6 shadow-sm border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>管理员已认证</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              你拥有上传权限，请通过管理后台进行操作
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin/novels"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors text-white"
              style={{ background: 'var(--accent)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              前往管理后台创建小说
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors border"
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
            >
              管理后台首页
            </Link>
          </div>
        </div>
      ) : (
        /* 普通用户视图：展示邮箱引导 */
        <div className="space-y-6">
          {/* 提示卡片 */}
          <div className="rounded-xl p-8 text-center space-y-6 shadow-sm border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                个人上传通道暂未开放
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                为确保作品质量和平台内容安全，当前仅支持由管理员审核后代为上传播。
                请将你的小说稿件发送至以下邮箱，管理员会尽快处理：
              </p>
            </div>

            {/* 邮箱 */}
            <a
              href="mailto:50541358@qq.com"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold transition-all hover:scale-105"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              50541358@qq.com
            </a>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              点击邮箱地址直接发送，或复制地址到你的邮箱客户端
            </p>
          </div>

          {/* 投稿须知 */}
          <div className="rounded-xl p-6 shadow-sm border space-y-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>投稿须知</h3>
            <ul className="space-y-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>1</span>
                <span><strong style={{ color: 'var(--text)' }}>稿件格式：</strong>请将小说以 Markdown (.md) 或 Word (.docx) 格式发送，建议附带封面图和简介</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>2</span>
                <span><strong style={{ color: 'var(--text)' }}>原创要求：</strong>投稿作品需为本人原创或已获得授权，严禁抄袭、盗版或未经授权的改编</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>3</span>
                <span><strong style={{ color: 'var(--text)' }}>内容规范：</strong>作品内容需符合国家法律法规和平台社区准则，不得包含违法违规信息</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>4</span>
                <span><strong style={{ color: 'var(--text)' }}>处理时间：</strong>管理员通常在 2-3 个工作日内完成审核和上传，请耐心等待</span>
              </li>
            </ul>
          </div>

          {/* 快捷入口 */}
          <div className="text-center pt-2">
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>想要先看看平台上的作品？</p>
            <Link
              href="/novels"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors border"
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
            >
              浏览全部作品
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
