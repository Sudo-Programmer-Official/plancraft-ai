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
    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    const subs = Array.isArray(data?.integrations?.pwa?.subscriptions) ? data.integrations.pwa.subscriptions : []
    if (!subs.length) {
      console.warn('[PWA] No push subscriptions for user', userId)
      return { ok: false, error: 'no subscriptions' }
    }

    const payload = JSON.stringify({
      title: 'PlanCraftAI Reminder',
      body: String(message || 'Reminder'),
      icon: '/icons/icon-192x192.png',
    })

    let ok = 0
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, payload)
        ok++
      } catch (err) {
        console.error('[PWA] Failed for sub:', err?.statusCode || '', err?.message || err)
      }
    }
    console.log('[PWA] Sent push', { userId, delivered: ok, total: subs.length })
    return { ok: ok > 0, delivered: ok }
  } catch (err) {
    console.error('[PWA] Error:', err?.message || err)
    return { ok: false, error: err?.message || String(err) }
  }
}
