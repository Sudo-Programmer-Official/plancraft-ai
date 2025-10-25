/* eslint-disable no-undef */
// Firebase Cloud Messaging service worker
// Handles background push notifications for Teams workspaces.

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const fallbackConfig = {
  apiKey: 'AIzaSyDI0qFImSxQFYkT5CRu2K1yEZuPX1W2xEY',
  authDomain: 'audit-agent-66451.firebaseapp.com',
  projectId: 'audit-agent-66451',
  storageBucket: 'audit-agent-66451.appspot.com',
  messagingSenderId: '488930745261',
  appId: '1:488930745261:web:5fe03c2568c323ec091f24',
};

const firebaseConfig = self.__FIREBASE_MESSAGING_CONFIG__ || fallbackConfig;

try {
  firebase.initializeApp(firebaseConfig);
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[FCM SW] Firebase already initialised or failed to initialise:', err);
}

const messaging = firebase.messaging();

function broadcastForeground(payload) {
  if (!payload) return;
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => {
        try {
          client.postMessage({ source: 'firebase-messaging-sw', payload });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[FCM SW] Failed to postMessage to client:', err);
        }
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[FCM SW] matchAll failed:', err);
    });
}

messaging.onBackgroundMessage((payload) => {
  broadcastForeground(payload);

  const notification = payload?.notification || {};
  const data = payload?.data || {};

  const title = notification.title || data.title || 'PlanCraftAI update';
  const options = {
    body: notification.body || data.body || 'You have a new activity.',
    icon: notification.icon || '/icons/icon-192x192.png',
    badge: notification.badge || '/icons/icon-72x72.png',
    data,
    tag: data.tag || 'plancraftai-update',
    actions: notification.actions,
    renotify: true,
  };

  self.registration.showNotification(title, options).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[FCM SW] showNotification failed:', err);
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return null;
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[FCM SW] notificationclick error:', err);
      }),
  );
});
