import fetch from 'node-fetch'
import { logger } from '../utils/logger.js'

const AI_BASE = process.env.AI_NLP_SERVICE_URL || process.env.AI_NLP_URL || 'http://localhost:5001'
const APP_TOKEN = process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || ''

export async function proxyAi(type, payload) {
  const url = `${AI_BASE}/ai/${type}`
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
