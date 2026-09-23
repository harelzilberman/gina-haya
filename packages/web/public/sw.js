const CACHE = 'gina-haya-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

/**
 * Returns true for requests that are safe to cache:
 *  - GET only
 *  - http: or https: protocol (never chrome-extension:, data:, blob:, etc.)
 *  - Same origin, or a static CDN host we explicitly allow
 *  - Not a Supabase or Railway API call (dynamic / user-specific)
 */
function isCacheable(request) {
  if (request.method !== 'GET') return false;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  // Never cache dynamic API endpoints
  if (url.pathname.includes('/api/')) return false;
  if (url.hostname.includes('supabase.co')) return false;
  if (url.hostname.includes('railway.app')) return false;

  // Allow same-origin requests
  if (url.origin === self.location.origin) return true;

  return false;
}

self.addEventListener('fetch', e => {
  if (!isCacheable(e.request)) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Only cache opaque-free successful responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE)
            .then(cache => cache.put(e.request, clone))
            .catch(() => { /* caching failure must never surface */ });
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/chupchu_final.png',
      badge: '/chupchu_final.png',
      data: { url: data.url ?? '/' },
      dir: 'rtl',
      lang: 'he',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'client', includeUncontrolled: true }).then(clientList => {
      const url = event.notification.data?.url ?? '/';
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
