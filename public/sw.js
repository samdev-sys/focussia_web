/* Focusia Web Push: muestra la notificación y abre la app al tocarla. */
self.addEventListener('push', (event) => {
  let data = { title: 'Focusia', body: '' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) { /* texto plano */ }
  const options = {
    body: data.body || '',
    icon: '/focusia-logo.png',
    badge: '/focusia-logo.png',
    data: { url: '/' },
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Focusia', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
