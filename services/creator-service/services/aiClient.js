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

export async function proxyAi(type, payload, options = {}) {
  const typeMap = {
    repurpose: 'generate/repurpose',
    hook: 'generate/hook',
    reel_script: 'generate/reel-script',
    story_frames: 'generate/story-frame',
    thread: 'generate/tweet-thread',
    linkedin_post: 'generate/linkedin-post',
    outreach_message: 'generate/outreach-message',
  }
  const endpoint = typeMap[type] || type
  const url = `${AI_BASE}/${endpoint}`
  logger.info(`Proxying AI call ${url}`)
  const workspaceId = payload?.workspaceId || null
  const callerHeaders = options.headers || {}
  const forwardedAuth = callerHeaders.authorization || callerHeaders.Authorization || null
  const forwardedAppToken =
    callerHeaders['x-app-token'] || callerHeaders['X-App-Token'] || callerHeaders['x-app_token'] || null

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(APP_TOKEN ? { 'x-app-token': APP_TOKEN } : {}),
      ...(forwardedAppToken ? { 'x-app-token': forwardedAppToken } : {}),
      ...(forwardedAuth ? { Authorization: forwardedAuth } : {}),
      ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    },
    body: JSON.stringify(workspaceId === undefined ? payload || {} : { ...(payload || {}), workspaceId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI service error: ${res.status} ${text}`)
  }
  return res.json()
}
