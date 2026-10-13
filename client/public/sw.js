/* Smart Routine service worker: high-priority alarm notifications.
 * Wakes the device on push, vibrates, shows Done / Snooze 5m actions.
 * Keep this file dependency-free (runs in SW scope).
 */
const CACHE = 'smart-routine-shell-v1';
const SHELL = ['/app', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  // Cache UI shell + fonts + chimes so the app opens instantly (<1.5s) on 3G.
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => [])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for shell/fonts/audio; network-first for API.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // never cache API
  if (/(\.(woff2?|ttf|mp3|wav|ogg|svg|png))$/.test(url.pathname) || SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(request))));
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try { data = { body: event.data.text() }; } catch { data = {}; }
  }
  const title = data.title || 'Smart Routine';
  const options = {
    body: data.body || 'একটি রুটিনের সময় হয়েছে। / A routine starts now.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || `routine-${data.routineId || 'now'}-${data.date || ''}`,
    renotify: true,
    requireInteraction: true, // high-priority: stays until user acts (device sleep / closed app)
    vibrate: [200, 100, 200],
    data: { url: data.url || '/app', routineId: data.routineId, date: data.date },
    actions: [
      { action: 'done', title: 'Done ✓' },
      { action: 'snooze', title: 'Snooze 5m' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, routineId, date } = event.notification.data || {};
  if (event.action === 'done' && routineId) {
    // Fire-and-forget completion; outbox on the page will reconcile the rest.
    event.waitUntil(
      (async () => {
        try {
          await fetch('/api/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ routineId, date, status: 'done' }),
          });
        } catch { /* offline — page outbox retries */ }
        const clients = await self.clients.matchAll({ type: 'window' });
        if (clients.length > 0) clients[0].focus();
        else if (url) self.clients.openWindow(url);
      })()
    );
    return;
  }
  if (event.action === 'snooze') {
    event.waitUntil(
      (async () => {
        await new Promise((r) => setTimeout(r, 5 * 60 * 1000));
        await self.registration.showNotification(event.notification.title, {
          body: event.notification.body,
          tag: `${event.notification.tag}-snoozed`,
          renotify: true,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: { url },
        });
      })()
    );
    return;
  }
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      if (clients.length > 0) clients[0].focus();
      else if (url) self.clients.openWindow(url);
    })()
  );
});
