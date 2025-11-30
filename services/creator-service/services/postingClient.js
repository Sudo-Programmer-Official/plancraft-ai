import fetch from 'node-fetch'

const POSTING_BASE =
  process.env.POSTING_SERVICE_URL ||
  process.env.POSTING_API_BASE ||
  'http://posting-service'

const APP_TOKEN = process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || ''

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra }
  if (APP_TOKEN) h['x-app-token'] = APP_TOKEN
  return h
}

async function handle(res) {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`posting-service error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function publishNow(payload) {
  const res = await fetch(`${POSTING_BASE}/messages/send-now`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload || {}),
  })
  return handle(res)
}

export async function scheduleMessage(payload) {
  const res = await fetch(`${POSTING_BASE}/messages/schedule`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload || {}),
  })
  return handle(res)
}
