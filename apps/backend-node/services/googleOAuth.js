import { db } from './firebaseAdmin.js'
import crypto from 'crypto'

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  // Optional: settings readonly for metadata
  'https://www.googleapis.com/auth/calendar.settings.readonly',
]

// Debug helper (enable with GOOGLE_OAUTH_DEBUG=1)
const OAUTH_DEBUG = String(process.env.GOOGLE_OAUTH_DEBUG || '').toLowerCase()
function dbg(...args) {
  if (OAUTH_DEBUG === '1' || OAUTH_DEBUG === 'true') {
    try { console.info('[GoogleOAuth]', ...args) } catch {}
  }
}

function getEnv(name, fallback = '') {
  const v = process.env[name]
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function sign(data, secret) {
  return b64url(crypto.createHmac('sha256', secret).update(data).digest())
}

function getStateSecret() {
  return getEnv('OAUTH_STATE_SECRET') || getEnv('APP_JWT_SECRET') || 'dev-state-secret'
}

async function mintState(userId, ttlSeconds = 600) {
  const nonce = crypto.randomBytes(16).toString('hex')
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + Math.max(60, Math.min(ttlSeconds, 3600))
  const payload = `v1.${userId}.${nonce}.${exp}`
  const secret = getStateSecret()
  const sig = sign(payload, secret)
  const token = `${payload}.${sig}`
  try {
    await db.collection('oauth_state').doc(`g_${nonce}`).set({
      userId: String(userId),
      provider: 'google',
      nonce,
      iat,
      exp,
      createdAt: new Date(),
    })
    dbg('mintState ok', { uid: String(userId), nonce, exp })
  } catch {}
  return token
}

export async function parseAndVerifyState(state) {
  try {
    const parts = String(state || '').split('.')
    if (parts.length !== 5) return null
    const [v, userId, nonce, expStr, sig] = parts
    if (v !== 'v1' || !userId || !nonce || !expStr || !sig) return null
    const payload = `${v}.${userId}.${nonce}.${expStr}`
    const expected = sign(payload, getStateSecret())
    if (expected !== sig) return null
    const exp = parseInt(expStr, 10)
    if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) return null
    // one-time use check
    try {
      const ref = db.collection('oauth_state').doc(`g_${nonce}`)
      const snap = await ref.get()
      if (!snap.exists) return null
      const data = snap.data() || {}
      if (String(data.userId) !== String(userId)) return null
      await ref.delete().catch(() => {})
      dbg('state verified', { uid: String(userId), nonce })
    } catch {}
    return { userId }
  } catch {
    return null
  }
}

export async function buildConsentUrl(userId) {
  const client_id = getEnv('GOOGLE_CLIENT_ID')
  const redirect_uri = getEnv('GOOGLE_REDIRECT_URI')
  if (!client_id || !redirect_uri) throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI')
  const state = await mintState(String(userId))
  const params = new URLSearchParams({
    client_id,
    redirect_uri,
    response_type: 'code',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    scope: GOOGLE_SCOPES.join(' '),
    state,
  })
  dbg('buildConsentUrl', { uid: String(userId), redirect_uri, client_id: client_id?.slice(0, 12) + '…' })
  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`
}

export async function exchangeCodeForTokens(code) {
  const client_id = getEnv('GOOGLE_CLIENT_ID')
  const client_secret = getEnv('GOOGLE_CLIENT_SECRET')
  const redirect_uri = getEnv('GOOGLE_REDIRECT_URI')
  if (!client_id || !client_secret || !redirect_uri) throw new Error('Missing Google OAuth credentials')
  const maskId = (s) => (s ? `${String(s).slice(0, 8)}…${String(s).slice(-6)}` : 'n/a')
  const fp = (id, sec) => (
    crypto.createHash('sha256').update(`${id || ''}:${sec || ''}`).digest('hex').slice(0, 12)
  )
  dbg('exchangeCodeForTokens start', {
    code: String(code || '').slice(0, 8) + '…',
    redirect_uri,
    client_id: maskId(client_id),
    secret_len: (client_secret || '').length,
    cred_fp: fp(client_id, client_secret),
  })
  const body = new URLSearchParams({
    code,
    client_id,
    client_secret,
    redirect_uri,
    grant_type: 'authorization_code',
  })
  const resp = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    dbg('exchangeCodeForTokens failed', { status: resp.status, text: text?.slice(0, 120) })
    throw new Error(`Token exchange failed: ${resp.status} ${text}`)
  }
  const json = await resp.json()
  // Normalize expiry_date in ms epoch
  const expiry_date = json.expires_in ? Date.now() + Number(json.expires_in) * 1000 : undefined
  dbg('exchangeCodeForTokens ok', { hasRefresh: !!json.refresh_token, expiresIn: json.expires_in })
  return { ...json, expiry_date }
}

export async function refreshAccessToken(refresh_token) {
  const client_id = getEnv('GOOGLE_CLIENT_ID')
  const client_secret = getEnv('GOOGLE_CLIENT_SECRET')
  if (!client_id || !client_secret || !refresh_token) throw new Error('Missing client or refresh token')
  const body = new URLSearchParams({
    refresh_token,
    client_id,
    client_secret,
    grant_type: 'refresh_token',
  })
  const resp = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Refresh failed: ${resp.status} ${text}`)
  }
  const json = await resp.json()
  const expiry_date = json.expires_in ? Date.now() + Number(json.expires_in) * 1000 : undefined
  return { ...json, expiry_date, refresh_token }
}

export async function getUserGoogleIntegration(userId) {
  const doc = await db.collection('users').doc(String(userId)).get()
  const data = doc.exists ? doc.data() : {}
  return (data?.integrations?.google) || null
}

export async function saveUserGoogleIntegration(userId, integration) {
  const payload = { integrations: { google: integration }, updatedAt: new Date() }
  await db.collection('users').doc(String(userId)).set(payload, { merge: true })
}

export async function saveUserGoogleTokens(userId, tokens) {
  const integ = (await getUserGoogleIntegration(userId)) || {}
  const merged = {
    connected: true,
    scopes: Array.from(new Set([...(integ?.scopes || []), ...GOOGLE_SCOPES])),
    token: tokens,
    calendars: Array.isArray(integ?.calendars) ? integ.calendars : [],
    sync: integ?.sync || { windowDays: 30, perCal: {}, lastRun: null, status: 'ok' },
    updatedAt: new Date(),
  }
  await saveUserGoogleIntegration(userId, merged)
  return merged
}

export async function ensureFreshAccessToken(userId) {
  const integ = (await getUserGoogleIntegration(userId)) || {}
  const token = integ?.token || {}
  const now = Date.now()
  let current = token
  if (!current?.access_token) throw new Error('No access token; reconnect Google')
  if (current?.expiry_date && Number(current.expiry_date) - 60000 < now) {
    // refresh if expiring in < 60s
    const refreshed = await refreshAccessToken(current.refresh_token)
    current = { ...current, ...refreshed }
    await saveUserGoogleTokens(userId, current)
  }
  return { tokens: current, integration: integ }
}
