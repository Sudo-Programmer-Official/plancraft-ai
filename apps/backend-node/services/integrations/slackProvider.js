import { db } from '../firebaseAdmin.js'

export async function send(userId, message, options = {}) {
  let webhook = options.webhookUrl
  if (!webhook) {
    const snap = await db.collection('users').doc(String(userId)).get()
    webhook = snap.exists ? snap.data()?.integrations?.slack?.webhookUrl : null
  }
  webhook = webhook || process.env.SLACK_WEBHOOK_URL
  if (!webhook) throw new Error('Slack webhook not configured')

  const resp = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message || 'Hello from PlanCraftAI 👋' }),
  })
  if (!resp.ok) {
    const err = await safeText(resp)
    throw new Error(`Slack send failed: ${resp.status} ${err}`)
  }
  return { ok: true }
}

async function safeText(resp) {
  try { return await resp.text() } catch { return '' }
}

