import { db } from './firebaseAdmin.js'
import { providers } from './integrations/index.js'

export async function sendNotification(userId, message, channel = 'all', options = {}) {
  const snap = await db.collection('users').doc(String(userId)).get()
  const data = snap.exists ? snap.data() : {}
  const prefs = data?.preferences?.notifications || {}

  const supported = ['whatsapp', 'slack']
  let channels = []
  if (channel === 'all') {
    channels = supported.filter((c) => !!prefs[c] || (c === 'slack' && !!process.env.SLACK_WEBHOOK_URL))
  } else if (Array.isArray(channel)) {
    channels = channel.filter((c) => supported.includes(c))
  } else if (typeof channel === 'string') {
    if (supported.includes(channel)) channels = [channel]
  }

  const results = {}
  for (const c of channels) {
    const provider = providers[c]
    if (!provider?.send) continue
    try {
      results[c] = await provider.send(userId, message, options[c] || options)
    } catch (e) {
      results[c] = { error: String(e?.message || e) }
    }
  }
  return results
}

