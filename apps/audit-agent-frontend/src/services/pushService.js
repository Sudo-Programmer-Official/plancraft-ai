// Lightweight PWA push registration utilities
// Requires env: VITE_VAPID_PUBLIC_KEY
import api from '@/services/api'

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export async function getRegistration() {
  if (!isPushSupported()) return null
  return navigator.serviceWorker.ready
}

export async function getCurrentSubscription() {
  try {
    const reg = await getRegistration()
    if (!reg) return null
    return await reg.pushManager.getSubscription()
  } catch (e) {
    console.warn('[PWA] getCurrentSubscription failed:', e)
    return null
  }
}

export async function hasSubscription() {
  const sub = await getCurrentSubscription()
  return !!sub
}

export async function ensurePermission() {
  if (!isPushSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export async function registerPushSubscription(userId) {
  try {
    if (!isPushSupported()) {
      console.warn('[PWA] Push not supported')
      return { ok: false, reason: 'not_supported' }
    }

    const granted = await ensurePermission()
    if (!granted) {
      console.warn('[PWA] Notifications permission not granted')
      return { ok: false, reason: 'permission_denied' }
    }

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
    })

    const json = sub.toJSON()
    const payload = {
      userId,
      endpoint: sub.endpoint,
      keys: {
        p256dh: json?.keys?.p256dh,
        auth: json?.keys?.auth
      },
      createdAt: new Date().toISOString()
    }

    await api.post('/push/register', payload)

    console.log('[PWA] Subscription registered:', payload.endpoint)
    return { ok: true, endpoint: payload.endpoint }
  } catch (err) {
    console.error('[PWA] Registration failed:', err)
    return { ok: false, error: String(err) }
  }
}

export async function unregisterPushSubscription() {
  try {
    const sub = await getCurrentSubscription()
    if (!sub) return { ok: true, changed: false }
    const res = await sub.unsubscribe()
    console.log('[PWA] Subscription unsubscribed')
    return { ok: res }
  } catch (err) {
    console.error('[PWA] Unsubscribe failed:', err)
    return { ok: false, error: String(err) }
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
