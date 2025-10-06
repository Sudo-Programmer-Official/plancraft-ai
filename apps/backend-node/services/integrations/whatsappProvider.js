import { db } from '../firebaseAdmin.js'

const API_BASE = 'https://graph.facebook.com/v16.0'
const DEBUG = (process.env.WHATSAPP_DEBUG === '1' || process.env.WHATSAPP_LOG === '1')

function mask(s) {
  if (!s) return null
  const str = String(s)
  if (str.length <= 4) return '****'
  return str.slice(0, 3) + '…' + str.slice(-2)
}

export async function send(userId, message, options = {}) {
  const token = process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN
  const phoneId = process.env.META_WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID
  if (DEBUG) console.log('[WhatsApp] config', { hasToken: !!token, hasPhoneId: !!phoneId })
  if (!token || !phoneId) {
    console.error('[WhatsApp] Missing API config', { hasToken: !!token, hasPhoneId: !!phoneId })
    throw new Error('WhatsApp API not configured. Set META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_ID')
  }

  let to = options.to
  if (!to) {
    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : null
    to = data?.integrations?.whatsapp?.phone
    const enabled = !!(data?.preferences?.notifications?.whatsapp)
    if (DEBUG) console.log('[WhatsApp] resolved recipient', { userId, to: mask(to), enabled })
  }
  if (!to) throw new Error('WhatsApp recipient phone not set for user')

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message || 'Hello from PlanCraftAI 👋' },
  }

  if (DEBUG) console.log('[WhatsApp] sending', { phoneId: mask(phoneId), to: mask(to), len: (message || '').length, preview: (message || '').slice(0, 30) })
  const resp = await fetch(`${API_BASE}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const dbgBody = await safeJson(resp)
  if (DEBUG) console.log('[WhatsApp] response', { status: resp.status, body: dbgBody })
  if (!resp.ok) {
    const err = dbgBody
    // Token expired / invalid
    if (resp.status === 401 && err?.error?.code === 190) {
      console.warn('[WhatsApp] Access token expired or invalid. Refresh META_WHATSAPP_TOKEN.', err?.error)
    }
    throw new Error(`WhatsApp send failed: ${resp.status} ${JSON.stringify(err)}`)
  }
  return dbgBody
}

async function safeJson(resp) {
  try { return await resp.json() } catch { return null }
}
