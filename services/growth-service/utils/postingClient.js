import axios from 'axios'

const BASE =
  process.env.POSTING_SERVICE_URL ||
  process.env.POSTING_API_BASE ||
  process.env.POSTING_URL ||
  'http://posting-service'

const APP_TOKEN = (process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || '').trim()

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (APP_TOKEN) headers['x-app-token'] = APP_TOKEN
  return headers
}

export async function enqueuePostingJob(job) {
  if (!job) return null
  const url = `${BASE.replace(/\/+$/, '')}/api/posting/jobs`
  const { data } = await axios.post(url, job, { headers: buildHeaders(), timeout: 10000 })
  return data
}
