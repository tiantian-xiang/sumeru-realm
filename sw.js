/* 淇庚の须弥之境 · Service Worker
 * 策略：
 *  1. 安装时缓存主页面 + 核心 CDN 资源
 *  2. 运行时 stale-while-revalidate：先读缓存，后台更新
 *  3. 不缓存 POST 请求和 API 调用
 */
const CACHE_NAME = 'sumeru-v3';
const CORE_ASSETS = [
  './',
  './SumeruRealm.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js',
  'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
  'https://cdn.jsdelivr.net/npm/idb@8/build/umd.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 只处理 GET，跳过 API/POST
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.includes('deepseek') || url.hostname.includes('localhost') && url.port !== '') return;

  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(resp => {
        // 成功响应才写缓存
        if (resp && resp.status === 200 && resp.type === 'basic' || resp.type === 'cors') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
