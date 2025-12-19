import axios from 'axios'

const POSTING_BASE =
  [
    process.env.POSTING_SERVICE_URL,
    process.env.POSTING_API_BASE,
    process.env.POSTING_URL,
    'http://posting-service',
    'http://localhost:8080',
  ]
    .map((val) => (val || '').trim())
    .find((val) => !!val)
    ?.replace(/\/+$/, '') || ''

const APP_TOKEN = (process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || '').trim()

function buildHeaders(workspaceId) {
  const headers = { 'Content-Type': 'application/json' }
  if (APP_TOKEN) {
    headers['x-app-token'] = APP_TOKEN
    headers['Authorization'] = `Bearer ${APP_TOKEN}`
  }
  if (workspaceId) headers['x-workspace-id'] = workspaceId
  return headers
}

export function postingServiceAvailable() {
  return !!POSTING_BASE
}

export async function enqueueNotificationJob(channel, payload = {}, meta = {}) {
  if (!POSTING_BASE) return null
  const body = {
    jobType: 'notification',
    channel,
    payload,
    meta: { ...meta },
  }
  const url = `${POSTING_BASE}/api/posting/jobs`
  const { data } = await axios.post(url, body, {
    headers: buildHeaders(meta.workspaceId || payload.workspaceId),
    timeout: 8000,
  })
  return data
}

export default {
  postingServiceAvailable,
  enqueueNotificationJob,
}
