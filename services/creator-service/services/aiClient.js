import fetch from 'node-fetch'
import { logger } from '../utils/logger.js'

const AI_BASE = process.env.AI_NLP_SERVICE_URL || 'http://localhost:5001'

export async function proxyAi(type, payload) {
  const url = `${AI_BASE}/ai/${type}`
  logger.info(`Proxying AI call ${url}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI service error: ${res.status} ${text}`)
  }
  return res.json()
}
