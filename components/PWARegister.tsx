'use client';

import { useEffect } from 'react';

/**
 * PWA Service Worker 注册组件
 * 客户端组件，在应用加载时注册 Service Worker
 */
export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // 延迟注册，避免影响首屏加载
      const timeoutId = setTimeout(() => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker 注册成功:', registration.scope);
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker 注册失败:', error);
          });
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, []);

  return null;
}
