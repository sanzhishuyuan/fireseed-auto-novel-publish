'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="text-center max-w-md">
        {/* 404 图形 */}
        <div className="relative mx-auto mb-8" style={{ width: '180px', height: '140px' }}>
          {/* 书本图形 */}
          <svg
            viewBox="0 0 180 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            aria-hidden="true"
          >
            {/* 书本主体 */}
            <path
              d="M20 30L90 20V120L20 110V30Z"
              fill="var(--bg-secondary)"
              stroke="var(--border)"
              strokeWidth="2"
            />
            <path
              d="M160 30L90 20V120L160 110V30Z"
              fill="var(--bg-card)"
              stroke="var(--border)"
              strokeWidth="2"
            />
            {/* 书脊 */}
            <path
              d="M90 20V120"
              stroke="var(--accent)"
              strokeWidth="3"
            />
            {/* 404 文字 */}
            <text
              x="90"
              y="85"
              textAnchor="middle"
              fill="var(--accent)"
              fontSize="48"
              fontWeight="bold"
              fontFamily="var(--font-family-primary)"
            >
              404
            </text>
            {/* 缺失的页面 */}
            <path
              d="M60 40L75 35L75 70L60 65Z"
              fill="var(--bg-secondary)"
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <path
              d="M105 35L120 40L120 65L105 70Z"
              fill="var(--bg-secondary)"
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          </svg>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          页面不存在
        </h1>

        {/* 描述 */}
        <p className="text-base mb-2" style={{ color: 'var(--text-secondary)' }}>
          抱歉，您访问的页面已失踪
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          可能已被删除、转移或从未存在
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary px-6 py-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 8H13M8 3L3 8l5 5" />
            </svg>
            返回首页
          </Link>
          <Link href="/novels" className="btn-secondary px-6 py-3">
            浏览作品
          </Link>
        </div>

        {/* 自动跳转提示 */}
        <p className="text-xs mt-8" style={{ color: 'var(--text-muted)' }} role="status" aria-live="polite">
          {countdown > 0 ? `${countdown}秒后自动返回首页...` : '正在跳转...'}
        </p>
      </div>
    </div>
  );
}
