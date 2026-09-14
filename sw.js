// 刷题 · Service Worker
// 缓存 app shell，离线/全屏启动可用
const CACHE = 'shuati-v10-glass';   // UI 换版必须递增此版本号，否则浏览器不会更新缓存
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // 页面导航（index.html）：network-first —— 每次打开优先取最新版，离线才回退缓存，
  // 避免“UI 更新后用户看到的仍是旧版、要刷两次”的问题
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(e.request).then((r) => {
        if (r && r.status === 200 && r.type === 'basic') {
          const c = r.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, c));
        }
        return r;
      }).catch(() =>
        caches.match(e.request).then((hit) => hit || caches.match('./index.html'))
      )
    );
    return;
  }
  // 其余同源静态资源：cache-first（命中即用），后台网络更新
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const update = fetch(e.request)
        .then((r) => {
          if (r && r.status === 200 && r.type === 'basic') {
            const c = r.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, c));
          }
          return r;
        })
        .catch(() => hit);
      return hit || update;
    })
  );
});
