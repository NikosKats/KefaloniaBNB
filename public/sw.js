// KefaloniaBNB Service Worker — Push Notifications + Offline Shell + App Badge
const CACHE_NAME = 'kefalonia-v1';

// Install: cache shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Push: show notification + update app icon badge
self.addEventListener('push', (event) => {
  let data = { title: 'KefaloniaBNB', body: 'You have a new notification', icon: '/icons/icon-192.png', url: '/account/notifications' };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/account/notifications' },
    actions: data.actions || [],
    tag: data.tag || 'kefalonia-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(function() {
      // Update app icon badge count (red number on icon like Facebook)
      if (navigator.setAppBadge) {
        return self.registration.getNotifications().then(function(notifications) {
          return navigator.setAppBadge(notifications.length + 1);
        });
      }
    })
  );
});

// Notification click: open/focus the relevant page + clear badge
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/account/notifications';

  event.waitUntil(
    // Clear badge when user taps a notification
    Promise.resolve(navigator.setAppBadge ? navigator.clearAppBadge() : undefined).then(function() {
      return clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then(function(clientList) {
      // If a window is already open, focus it and navigate
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.includes(self.location.origin)) {
          clientList[i].focus();
          clientList[i].navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});

// Message from client: clear badge when app is opened
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if (navigator.setAppBadge) {
      navigator.clearAppBadge();
    }
  }
});

// Fetch: network-first for pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

  // For navigation requests, always go network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html') || new Response('Offline'))
    );
    return;
  }

  // For static assets, cache-first
  if (event.request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
