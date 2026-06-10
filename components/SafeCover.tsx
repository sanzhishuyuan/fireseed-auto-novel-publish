'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface SafeCoverProps {
  src: string | null | undefined;
  alt: string;
  tag?: string;
  className?: string;
  aspectRatio?: string;
}

/**
 * 安全的封面图片组件
 * - 图片加载成功 → 显示封面
 * - 图片加载失败 / 无图片 → 显示渐变色默认封面
 */
export default function SafeCover({ src, alt, tag, className = '', aspectRatio = 'aspect-[3/4]' }: SafeCoverProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleError = useCallback(() => setImgError(true), []);
  const handleLoad = useCallback(() => setImgLoaded(true), []);

  const primaryTag = tag?.split(',')[0]?.trim() || '故事';
  const tagEmojis: Record<string, string> = {
    '玄幻': '⚡', '都市': '🏙', '仙侠': '🏯', '言情': '💕',
    '科幻': '🚀', '悬疑': '🔮', '历史': '📜', '恐怖': '👻',
    '军事': '⚔️', '奇幻': '🔮', '武侠': '⚡', '故事': '✨'
  };
  const emoji = tagEmojis[primaryTag] || '✨';

  // 渐变配色随标签变化
  const tagGradients: Record<string, string> = {
    '玄幻': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    '都市': 'linear-gradient(135deg, #2d3436 0%, #636e72 50%, #b2bec3 100%)',
    '仙侠': 'linear-gradient(135deg, #5c3d1e 0%, #8b5e3c 50%, #c49a6c 100%)',
    '言情': 'linear-gradient(135deg, #6b21a8 0%, #db2777 50%, #f472b6 100%)',
    '科幻': 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #38bdf8 100%)',
    '悬疑': 'linear-gradient(135deg, #111827 0%, #374151 50%, #6b7280 100%)',
    '历史': 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #d97706 100%)',
    '武侠': 'linear-gradient(135deg, #1c1917 0%, #44403c 50%, #78716c 100%)',
    '奇幻': 'linear-gradient(135deg, #312e81 0%, #5b21b6 50%, #8b5cf6 100%)',
  };
  const bgGradient = tagGradients[primaryTag] || 'linear-gradient(135deg, #5c3d1e 0%, #8b5e3c 50%, #c49a6c 100%)';

  const hasCover = src && !imgError;

  return (
    <div className={`relative overflow-hidden ${aspectRatio} ${className}`}>
      {hasCover ? (
        <>
          {/* 封面图片 - 使用 Next.js Image 组件优化 */}
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={`object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onError={handleError}
            onLoad={handleLoad}
            priority={false}
            quality={80}
          />
          {/* 加载中占位 */}
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          )}
        </>
      ) : (
        /* 默认封面（渐变色 + 标签 Emoji） */
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: bgGradient }}
        >
          <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center mb-3">
            <span className="text-2xl">{emoji}</span>
          </div>
          <span className="text-white/60 text-xs font-medium tracking-widest uppercase">
            {primaryTag}
          </span>
        </div>
      )}
    </div>
  );
}
