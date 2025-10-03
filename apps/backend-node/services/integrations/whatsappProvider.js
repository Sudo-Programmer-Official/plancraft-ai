import { db } from '../firebaseAdmin.js'

const API_BASE = 'https://graph.facebook.com/v16.0'

export async function send(userId, message, options = {}) {
  const token = process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN
  const phoneId = process.env.META_WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) {
    throw new Error('WhatsApp API not configured. Set META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_ID')
  }

  let to = options.to
  if (!to) {
    const snap = await db.collection('users').doc(String(userId)).get()
    to = snap.exists ? snap.data()?.integrations?.whatsapp?.phone : null
  }
  if (!to) throw new Error('WhatsApp recipient phone not set for user')

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message || 'Hello from PlanCraftAI 👋' },
  }

  const resp = await fetch(`${API_BASE}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const err = await safeJson(resp)
    throw new Error(`WhatsApp send failed: ${resp.status} ${JSON.stringify(err)}`)
  }
  return await safeJson(resp)
}

async function safeJson(resp) {
  try { return await resp.json() } catch { return null }
}
