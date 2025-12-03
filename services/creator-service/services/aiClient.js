import fetch from 'node-fetch'
import { logger } from '../utils/logger.js'

function resolveAiBase() {
  const raw =
    process.env.AI_NLP_SERVICE_URL ||
    process.env.AI_NLP_URL ||
    process.env.NLP_SERVICE_URL ||
    process.env.NLP_API_BASE ||
    ''
  if (raw) {
    const base = raw.replace(/\/+$/, '')
    // If caller already provided full path (e.g., https://.../api/ai), respect it
    if (/\/api\/ai$/.test(base)) return base
    return `${base}/api/ai`
  }
  // Local default
  return 'http://localhost:5001/api/ai'
}

const AI_BASE = resolveAiBase()
const APP_TOKEN = process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || ''

export async function proxyAi(type, payload) {
  const url = `${AI_BASE}/${type}`
  logger.info(`Proxying AI call ${url}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(APP_TOKEN ? { 'x-app-token': APP_TOKEN } : {}),
    },
    body: JSON.stringify(payload || {}),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI service error: ${res.status} ${text}`)
  }
  return res.json()
}
