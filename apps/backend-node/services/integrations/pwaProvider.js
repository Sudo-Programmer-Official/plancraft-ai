import webpush from 'web-push'
import { db } from '../firebaseAdmin.js'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@plancraftai.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  } catch (e) {
    console.warn('[PWA] setVapidDetails failed:', e?.message || e)
  }
} else {
  console.warn('[PWA] VAPID keys not set; push will be disabled')
}

export async function sendPWA(userId, message) {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { ok: false, error: 'missing vapid keys' }
    const userRef = db.collection('users').doc(String(userId))
    const snap = await userRef.get()
    const data = snap.exists ? snap.data() : {}
    let subs = Array.isArray(data?.integrations?.pwa?.subscriptions) ? data.integrations.pwa.subscriptions : []
    if (!subs.length) {
      try {
        const subSnap = await userRef.collection('pushSubscriptions').get()
        subs = subSnap.docs
          .map((doc) => doc.data() || {})
          .filter((entry) => entry?.endpoint)
      } catch (error) {
        console.warn('[PWA] Failed to load pushSubscriptions subcollection', error?.message || error)
      }
    }
    if (!subs.length) {
      console.warn('[PWA] No push subscriptions for user', userId)
      return { ok: false, error: 'no subscriptions' }
    }

    const isStructured = message && typeof message === 'object'
    const title = isStructured && message.title ? String(message.title) : 'PlanCraftAI Reminder'
    const body = isStructured && message.body ? String(message.body) : String(message || 'Reminder')
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      data: isStructured && message.data ? message.data : undefined,
    })

    let ok = 0
    const expired = new Set()
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, payload)
        ok++
      } catch (err) {
        const code = err?.statusCode || err?.status || null
        const endpoint = sub?.endpoint || null
        if (code === 404 || code === 410) {
          console.log('[PWA] Subscription expired; removing', { userId, endpoint })
          if (endpoint) expired.add(endpoint)
        } else {
          console.error('[PWA] Failed for sub:', code || '', err?.message || err)
        }
      }
    }
    if (expired.size) {
      try {
        const filtered = subs.filter((s) => s?.endpoint && !expired.has(s.endpoint))
        await db.collection('users').doc(String(userId)).set(
          {
            integrations: {
              ...(data?.integrations || {}),
              pwa: {
                ...(data?.integrations?.pwa || {}),
                subscriptions: filtered,
              },
            },
          },
          { merge: true },
        )
        console.log('[PWA] Pruned expired subscriptions', { userId, removed: expired.size })
      } catch (err) {
        console.warn('[PWA] Failed to prune expired subscriptions', err?.message || err)
      }
    }
    console.log('[PWA] Sent push', { userId, delivered: ok, total: subs.length })
    return { ok: ok > 0, delivered: ok }
  } catch (err) {
    console.error('[PWA] Error:', err?.message || err)
    return { ok: false, error: err?.message || String(err) }
  }
}
