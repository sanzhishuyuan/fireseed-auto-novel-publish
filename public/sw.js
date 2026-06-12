// FireSeed PWA Service Worker
// 缓存策略：静态资源优先缓存，API 请求优先网络

const CACHE_NAME = 'fireseed-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-icon-192.svg',
  '/pwa-icon-512.svg'
];

// 安装：预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理同源请求
  if (url.origin !== self.location.origin) return;

  // API 请求：网络优先，缓存回退
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静态资源（.next, /public）：缓存优先
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/static/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 导航请求（页面）：网络优先，离线时展示缓存
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 其他请求：网络优先
  event.respondWith(networkFirst(request));
});

// 网络优先策略
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // 缓存成功的响应
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // 离线：尝试从缓存获取
    const cached = await caches.match(request);
    if (cached) return cached;

    // 导航请求离线时返回简单离线页面
    if (request.mode === 'navigate') {
      return new Response(
        `<!DOCTYPE html>
        <html lang="zh-CN">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>FireSeed - 离线</title>
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0b0b0f;color:#f0ece4;text-align:center;padding:20px}
          .container{max-width:400px}
          h1{font-size:2rem;margin-bottom:0.5rem;background:linear-gradient(135deg,#7c3aed,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
          p{color:#9a9a8e;line-height:1.6}
          .icon{font-size:4rem;margin-bottom:1rem}
        </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🌱</div>
            <h1>FireSeed</h1>
            <p>当前无网络连接，请稍后再试。</p>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
      );
    }

    return new Response('离线', { status: 503 });
  }
}

// 缓存优先策略
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('离线', { status: 503 });
  }
}
