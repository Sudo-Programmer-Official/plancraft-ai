import { requestNotificationPermission, onForegroundMessage } from '@/firebase/messaging'
import { getAuth } from 'firebase/auth'
import { useToastStore } from '@/stores/toastStore'
import { useNotificationStore, channelRouteMap } from '@/stores/notificationStore'
import { trackEvent } from '@/services/analytics'

let initializationPromise = null
let foregroundUnsubscribe = null
let registrationPromise = null
const receivedMessageIds = new Set()
let serviceWorkerListenerRegistered = false

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDI0qFImSxQFYkT5CRu2K1yEZuPX1W2xEY',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'audit-agent-66451.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'audit-agent-66451',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'audit-agent-66451.appspot.com',
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_SENDER_ID || '488930745261',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:488930745261:web:5fe03c2568c323ec091f24',
  }
}

async function ensureMessagingServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .getRegistration('/firebase-messaging-sw.js')
      .then(async (existing) => {
        if (existing) return existing
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          })
          return registration
        } catch (err) {
          console.warn('[Notifications] Failed to register messaging service worker:', err)
          return null
        }
      })
      .catch((err) => {
        console.warn('[Notifications] Failed to get messaging service worker:', err)
        return null
      })
  }
  const registration = await registrationPromise

  try {
    const configMessage = {
      type: 'fcm-config',
      config: getFirebaseConfig(),
    }
    const worker = registration?.active || registration?.waiting || registration?.installing || navigator.serviceWorker?.controller
    worker?.postMessage?.(configMessage)
  } catch (err) {
    console.warn('[Notifications] Failed to post config to SW:', err)
  }

  return registration
}

function parseNotificationPayload(payload) {
  if (!payload) return null
  const notification = payload.notification || {}
  const data = payload.data || {}

  const title = notification.title || data.title || 'New update'
  const body = notification.body || data.body || ''
  const channel = data.channel || data.type || 'feed'
  const orgId = data.orgId || data.org_id || data.organizationId || null
  const route = channelRouteMap[channel?.toLowerCase?.() || ''] || null

  const messageId = payload.messageId || data.messageId || data.id || `${channel}-${Date.now()}`

  const url = data.url || data.link || null
  const actor = data.actorName || data.actor || null
  const entity = data.entity || data.subject || null

  return {
    title,
    body,
    channel,
    route,
    orgId,
    url,
    actor,
    entity,
    messageId,
    raw: payload,
  }
}

function showToast(parsed) {
  const toastStore = useToastStore()
  const messageParts = [parsed.body]
  if (!parsed.body && parsed.actor && parsed.entity) {
    messageParts[0] = `${parsed.actor} updated ${parsed.entity}`
  }
  const message = messageParts.filter(Boolean).join(' ')
  toastStore.push(message || 'You have a new update.', {
    type: 'info',
    duration: 5200,
    action: parsed.url
      ? {
          label: 'Open',
          handler: () => {
            try {
              if (parsed.url?.startsWith?.('http')) {
                window.open(parsed.url, '_blank', 'noopener')
              } else {
                window.location.assign(parsed.url)
              }
            } catch (err) {
              console.warn('[Notifications] Failed to navigate from toast:', err)
            }
          },
        }
      : undefined,
  })
}

function incrementBadge(parsed) {
  const notificationStore = useNotificationStore()
  if (parsed.route) {
    notificationStore.increment(parsed.route)
  } else if (parsed.channel) {
    notificationStore.bumpChannel(parsed.channel)
  }
}

function handleIncomingMessage(payload, origin = 'foreground') {
  const parsed = parseNotificationPayload(payload)
  if (!parsed) return

  if (parsed.messageId && receivedMessageIds.has(parsed.messageId)) {
    return
  }
  if (parsed.messageId) {
    receivedMessageIds.add(parsed.messageId)
    if (receivedMessageIds.size > 2000) {
      const iterator = receivedMessageIds.values()
      receivedMessageIds.delete(iterator.next().value)
    }
  }

  trackEvent('notification_received', {
    channel: parsed.channel,
    origin,
    orgId: parsed.orgId,
  })

  incrementBadge(parsed)
  showToast(parsed)
}

function registerServiceWorkerMessageListener() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  if (serviceWorkerListenerRegistered) return
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event?.data?.payload) {
      handleIncomingMessage(event.data.payload, 'background')
    }
  })
  serviceWorkerListenerRegistered = true
}

async function maybeRegisterFallback(uid) {
  try {
    const { registerPushSubscription, isPushSupported } = await import('@/services/pushService.js')
    if (!isPushSupported()) return
    if (!uid) return
    const status = await registerPushSubscription(uid)
    if (!status?.ok) {
      console.warn('[Notifications] Fallback push registration failed:', status)
      trackEvent('notification_fallback_failed', { reason: status?.reason || status?.error || 'unknown' })
    }
    trackEvent('notification_fallback_registered', { ok: status?.ok ?? false })
  } catch (err) {
    console.warn('[Notifications] Optional fallback push registration failed:', err)
    trackEvent('notification_fallback_failed', { error: String(err) })
  }
}

export async function initNotificationChannel() {
  if (initializationPromise) return initializationPromise

  initializationPromise = (async () => {
    const registration = await ensureMessagingServiceWorker()
    const token = await requestNotificationPermission({ serviceWorkerRegistration: registration })
    const auth = getAuth()
    const currentUid = auth?.currentUser?.uid || null

    if (!token) {
      console.warn('[Notifications] No FCM token obtained. Attempting fallback channels.')
      await maybeRegisterFallback(currentUid)
      return { token: null, registration }
    }

    registerServiceWorkerMessageListener()

    foregroundUnsubscribe = await onForegroundMessage((payload) => {
      handleIncomingMessage(payload, 'foreground')
    })

    trackEvent('notification_channel_ready', {
      tokenObtained: !!token,
      usingFallback: false,
    })

    return { token, registration }
  })().catch(async (err) => {
    console.error('[Notifications] Failed to initialise channel:', err)
    initializationPromise = null
    const auth = getAuth()
    await maybeRegisterFallback(auth?.currentUser?.uid || null)
    throw err
  })

  return initializationPromise
}

export function teardownNotificationChannel() {
  try {
    foregroundUnsubscribe?.()
  } catch {}
  foregroundUnsubscribe = null
  initializationPromise = null
}
