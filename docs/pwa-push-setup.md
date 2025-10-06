PWA Web Push Setup

Overview
- Users must create a Push subscription in the browser and register it with the backend so reminders can be delivered.

Frontend
- Add env in apps/audit-agent-frontend/.env:
  - VITE_VAPID_PUBLIC_KEY=
  - VITE_API_BASE=https://your-api-base/api
- Use NotificationBanner.vue to prompt users to enable notifications:
  - Import and place in a top-level layout: <NotificationBanner :user-id="authStore.user?.uid" />
- Optionally call registerPushSubscription(uid) after login for a seamless experience.

Backend
- New route: apps/backend-node/routes/pushRoutes.js
  - Mount in your Express app: app.use('/api/push', pushRoutes)
- Subscriptions are stored at users/{uid}/pushSubscriptions/{tokenId}

Testing
- Load app, grant notifications, see console: [PWA] Subscription registered: …
- Firestore should have users/{uid}/pushSubscriptions/* docs.

Cleanup
- On logout, call unregisterPushSubscription() to remove the browser’s subscription.

