// src/services/pwaService.js
import api from '@/services/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export async function subscribeUserToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push not supported')
  }
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error('VAPID public key not configured')

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    // Already subscribed; send to backend to ensure it’s saved
    await api.post('/settings/updateIntegrations', {
      userId,
      integrations: { pwa: { subscriptions: [existing.toJSON()] } },
    })
    return existing
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
  await api.post('/settings/updateIntegrations', {
    userId,
    integrations: { pwa: { subscriptions: [sub.toJSON()] } },
  })
  return sub
}

export async function unsubscribeUserFromPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
  await api.post('/settings/updateIntegrations', {
    userId,
    integrations: { pwa: { subscriptions: [] } },
  })
  return true
}

export async function ensurePushSubscription(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, error: 'Push not supported' }
  }
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) return { ok: false, error: 'VAPID public key not configured' }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    if (Notification.permission === 'denied') return { ok: false, error: 'Notifications permission denied' }
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }
  await api.post('/settings/updateIntegrations', {
    userId,
    integrations: { pwa: { subscriptions: [sub.toJSON()] } },
  })
  return { ok: true, subscription: sub.toJSON() }
}

export async function testPush(userId, message = '🔔 Push test from PlanCraftAI') {
  const res = await api.post('/test/notify', { userId, message, channels: ['pwa'] })
  return res?.data || { ok: false }
}
