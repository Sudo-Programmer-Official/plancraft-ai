/* eslint-disable no-undef */
/**
 * 🔔 Firebase Cloud Messaging Service Worker
 * Handles background push notifications for PlanCraftAI / Teams workspaces.
 * 
 * Features:
 * - Safe Firebase initialization (with fallback config)
 * - Broadcasts messages to all active clients (tabs)
 * - Shows notifications with fallbacks
 * - Opens or focuses tab on click
 * - Reliable with event.waitUntil()
 *
 * Deployment:
 * Place this file at your app root (e.g. /public/firebase-messaging-sw.js)
 * Accessible at: https://yourdomain.com/firebase-messaging-sw.js
 */

// -----------------------------------------------------------------------------
// 🔹 Firebase Setup
// -----------------------------------------------------------------------------
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Fallback config (used if __FIREBASE_MESSAGING_CONFIG__ isn’t injected)
const fallbackConfig = {
  apiKey: 'AIzaSyDI0qFImSxQFYkT5CRu2K1yEZuPX1W2xEY',
  authDomain: 'audit-agent-66451.firebaseapp.com',
  projectId: 'audit-agent-66451',
  storageBucket: 'audit-agent-66451.appspot.com',
  messagingSenderId: '488930745261',
  appId: '1:488930745261:web:5fe03c2568c323ec091f24',
};

// Use the injected config if available, otherwise fallback
const firebaseConfig = self.__FIREBASE_MESSAGING_CONFIG__ || fallbackConfig;

try {
  firebase.initializeApp(firebaseConfig);
  console.log('[FCM SW] Firebase initialized');
} catch (err) {
  console.warn('[FCM SW] Firebase already initialized or failed to initialize:', err);
}

// Create messaging instance
const messaging = firebase.messaging();

// -----------------------------------------------------------------------------
// 🔹 Broadcast messages to open tabs
// -----------------------------------------------------------------------------
function broadcastForeground(payload) {
  if (!payload) return;
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => {
        try {
          client.postMessage({ source: 'firebase-messaging-sw', payload });
        } catch (err) {
          console.warn('[FCM SW] Failed to postMessage to client:', err);
        }
      });
    })
    .catch((err) => {
      console.warn('[FCM SW] matchAll failed:', err);
    });
}

// -----------------------------------------------------------------------------
// 🔹 Background Message Handler
// -----------------------------------------------------------------------------
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Received background message:', payload);
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
    renotify: true,
    actions: notification.actions || [],
  };

  // Use waitUntil() to prevent early termination
  self.addEventListener('push', (event) => {
    event.waitUntil(
      self.registration.showNotification(title, options).catch((err) => {
        console.warn('[FCM SW] showNotification failed:', err);
      })
    );
  });

  // Also immediately show if background push arrived via FCM event directly
  self.registration.showNotification(title, options).catch((err) => {
    console.warn('[FCM SW] showNotification (direct) failed:', err);
  });
});

// -----------------------------------------------------------------------------
// 🔹 Notification Click Handler
// -----------------------------------------------------------------------------
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
        console.warn('[FCM SW] notificationclick error:', err);
      })
  );
});

// -----------------------------------------------------------------------------
// 🔹 Lifecycle & Debug Logging
// -----------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  console.log('[FCM SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Activated');
  event.waitUntil(self.clients.claim());
});

if (self.location.hostname === 'localhost') {
  console.log('[FCM SW] Running in development mode');
}

// -----------------------------------------------------------------------------
// ✅ End of File
// -----------------------------------------------------------------------------