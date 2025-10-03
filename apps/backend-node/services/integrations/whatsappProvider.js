import { db } from '../firebaseAdmin.js'

const API_BASE = 'https://graph.facebook.com/v16.0'

export async function send(userId, message, options = {}) {
  const token = process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN
  const phoneId = process.env.META_WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) {
    console.error('[WhatsApp] Missing API config', { hasToken: !!token, hasPhoneId: !!phoneId })
    throw new Error('WhatsApp API not configured. Set META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_ID')
  }

  let to = options.to
  if (!to) {
    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : null
    to = data?.integrations?.whatsapp?.phone
    console.log('[WhatsApp] resolved recipient', { userId, to: !!to })
  }
  if (!to) throw new Error('WhatsApp recipient phone not set for user')

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message || 'Hello from PlanCraftAI 👋' },
  }

  console.log('[WhatsApp] sending', { phoneId, to, len: (message || '').length })
  const resp = await fetch(`${API_BASE}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  console.log('[WhatsApp] response status', resp.status)
  if (!resp.ok) {
    const err = await safeJson(resp)
    throw new Error(`WhatsApp send failed: ${resp.status} ${JSON.stringify(err)}`)
  }
  const body = await safeJson(resp)
  console.log('[WhatsApp] ok', body)
  return body
}

async function safeJson(resp) {
  try { return await resp.json() } catch { return null }
}
