import { db } from './firebaseAdmin.js'
import crypto from 'crypto'
import nodeFetch from 'node-fetch'
import { removeIntegrationAccount, listUserIntegrationAccounts } from './integrationAccountService.js'
import { deleteExternalEventsForAccount } from './externalEventsService.js'
import { upsertIntegrationAccount, updateIntegrationAccountTokens } from './integrationAccountService.js'

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : nodeFetch

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

function cleanEnvValue(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  const isWrappedInQuotes = (first === '"' && last === '"') || (first === "'" && last === "'")
  return isWrappedInQuotes && trimmed.length > 1 ? trimmed.slice(1, -1).trim() : trimmed
}

function getEnv(name, fallback = '') {
  const cleaned = cleanEnvValue(process.env[name])
  return cleaned || fallback
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

function cleanAccountId(raw, fallback = 'primary') {
  const value = String(raw || fallback || '').trim() || 'primary'
  return value.replace(/[^a-zA-Z0-9@._-]/g, '_').slice(0, 120)
}

function normalizeAccount(raw = {}, fallbackId = 'primary') {
  const sync = raw.sync || {}
  const accountId = cleanAccountId(raw.accountId || raw.id || fallbackId)
  return {
    accountId,
    accountEmail: raw.accountEmail || raw.email || raw.token?.email || null,
    connected: raw.connected !== false && !!(raw.token?.access_token || raw.token?.refresh_token),
    token: raw.token || null,
    calendars: Array.isArray(raw.calendars) ? raw.calendars : [],
    primary: !!raw.primary,
    sync: {
      windowDays: Number.isFinite(sync.windowDays) ? Number(sync.windowDays) : 30,
      perCal: sync.perCal || {},
      lastRun: sync.lastRun || raw.lastRun || null,
      status: sync.status || raw.status || 'ok',
    },
    scopes: Array.isArray(raw.scopes) ? raw.scopes : [],
  }
}

export function normalizeGoogleIntegration(data = {}) {
  const accs = Array.isArray(data.accounts) ? data.accounts.map((a) => normalizeAccount(a, data.primaryAccountId || 'primary')) : []
  if (!accs.length && (data.token || data.calendars || data.connected)) {
    accs.push(
      normalizeAccount(
        {
          ...data,
          primary: true,
        },
        data.primaryAccountId || 'primary',
      ),
    )
  }
  const primaryAccountId = cleanAccountId(data.primaryAccountId || accs[0]?.accountId || 'primary')
  const primaryAccount = accs.find((a) => a.accountId === primaryAccountId) || accs[0] || null
  const scopes = Array.from(new Set([...(data.scopes || []), ...accs.flatMap((a) => a.scopes || [])]))
  const connected = accs.some((a) => a.connected)
  return {
    connected,
    primaryAccountId,
    accounts: accs,
    scopes,
    token: primaryAccount?.token || null,
    accountEmail: primaryAccount?.accountEmail || null,
    updatedAt: data.updatedAt || new Date(),
  }
}

async function fetchGoogleProfile(tokens) {
  if (!tokens?.access_token) return null
  try {
    const resp = await fetchFn('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
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
  console.log('client_id:', client_id);
  const client_secret = getEnv('GOOGLE_CLIENT_SECRET')
  console.log('client_secret:', client_secret);
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
  const resp = await fetchFn(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
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
  const resp = await fetchFn(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
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
  return normalizeGoogleIntegration((data?.integrations?.google) || {})
}

export async function saveUserGoogleIntegration(userId, integration) {
  const normalized = normalizeGoogleIntegration(integration || {})
  const payload = { integrations: { google: normalized }, updatedAt: new Date() }
  await db.collection('users').doc(String(userId)).set(payload, { merge: true })
  return normalized
}

export async function saveUserGoogleTokens(userId, tokens, accountMeta = {}) {
  const integ = (await getUserGoogleIntegration(userId)) || normalizeGoogleIntegration({})
  const profile = accountMeta.profile || (await fetchGoogleProfile(tokens))
  const accountEmail = accountMeta.accountEmail || profile?.email || null
  const accountId = cleanAccountId(accountMeta.accountId || accountEmail || profile?.sub || integ.primaryAccountId || 'primary')
  const existingIdx = Array.isArray(integ.accounts) ? integ.accounts.findIndex((a) => a.accountId === accountId) : -1
  const existing = existingIdx >= 0 ? integ.accounts[existingIdx] : null
  const refreshToken = tokens?.refresh_token || existing?.token?.refresh_token || integ?.token?.refresh_token || null
  const mergedAccount = normalizeAccount(
    {
      ...(existing || {}),
      accountId,
      accountEmail: accountEmail || existing?.accountEmail || null,
      token: { ...tokens, refresh_token: refreshToken },
      connected: true,
      primary: accountMeta.primary === true || existing?.primary || (!integ.primaryAccountId && existingIdx <= 0),
      scopes: Array.from(new Set([...(existing?.scopes || []), ...GOOGLE_SCOPES])),
    },
    accountId,
  )

  const accounts = Array.isArray(integ.accounts) ? integ.accounts.slice() : []
  if (existingIdx >= 0) accounts.splice(existingIdx, 1, mergedAccount)
  else accounts.push(mergedAccount)

  const mergedIntegration = {
    ...integ,
    accounts,
    primaryAccountId: integ.primaryAccountId || accountId,
    connected: accounts.some((a) => a.connected),
    scopes: Array.from(new Set([...(integ.scopes || []), ...GOOGLE_SCOPES])),
    updatedAt: new Date(),
  }

  const normalized = await saveUserGoogleIntegration(userId, mergedIntegration)
  try {
    await upsertIntegrationAccount({
      userId: String(userId),
      provider: 'google_calendar',
      accountId,
      accountEmail: accountEmail || null,
      accessToken: tokens?.access_token || null,
      refreshToken,
      tokenExpiry: tokens?.expiry_date || null,
      metadata: {
        calendars: mergedAccount.calendars || [],
        sync: mergedAccount.sync || {},
      },
    })
  } catch (err) {
    console.warn('[GoogleOAuth] Failed to upsert integration account', err?.message || err)
  }
  return normalized
}

export async function ensureFreshAccessToken(userId, accountId = null) {
  const integ = (await getUserGoogleIntegration(userId)) || normalizeGoogleIntegration({})
  const targetId = cleanAccountId(accountId || integ.primaryAccountId || integ.accounts?.[0]?.accountId || 'primary')
  const account = (integ.accounts || []).find((a) => a.accountId === targetId) || integ.accounts?.[0] || null
  const token = account?.token || {}
  const now = Date.now()
  let current = token
  if (!current?.access_token) throw new Error('No access token; reconnect Google')
  if (current?.expiry_date && Number(current.expiry_date) - 60000 < now) {
    // refresh if expiring in < 60s
    const refreshed = await refreshAccessToken(current.refresh_token)
    current = { ...current, ...refreshed }
    await saveUserGoogleTokens(userId, current, { accountId: targetId, accountEmail: account?.accountEmail || null })
    try {
      await updateIntegrationAccountTokens(userId, 'google_calendar', {
        accountId: targetId,
        accessToken: current.access_token,
        refreshToken: current.refresh_token,
        tokenExpiry: current.expiry_date,
      })
    } catch {}
  }
  return { tokens: current, integration: integ, account: account || null }
}

export async function disconnectGoogleIntegration(userId, accountId = null) {
  if (!userId) return
  const integ = (await getUserGoogleIntegration(userId)) || normalizeGoogleIntegration({})
  const targetId = accountId ? cleanAccountId(accountId) : null
  let accounts = Array.isArray(integ.accounts) ? integ.accounts.slice() : []
  let removed = []

  if (targetId) {
    removed = accounts.filter((a) => a.accountId === targetId)
    accounts = accounts.filter((a) => a.accountId !== targetId)
  } else {
    removed = accounts
    accounts = []
  }

  const updated = {
    ...integ,
    accounts,
    connected: accounts.some((a) => a.connected),
    primaryAccountId: accounts[0]?.accountId || null,
    token: null,
    calendars: [],
    sync: { status: 'disconnected', perCal: {}, lastRun: null },
    updatedAt: new Date(),
  }

  await saveUserGoogleIntegration(userId, updated)
  for (const acc of removed) {
    const aid = acc.accountId || 'primary'
    try {
      await removeIntegrationAccount(userId, 'google_calendar', aid)
    } catch (err) {
      console.warn('[GoogleOAuth] removeIntegrationAccount failed', err?.message || err)
    }
    try {
      await deleteExternalEventsForAccount(userId, 'google_calendar', aid)
    } catch (err) {
      console.warn('[GoogleOAuth] deleteExternalEventsForAccount failed', err?.message || err)
    }
  }
  // If no accountId passed, remove any lingering integrationAccount docs
  if (!targetId) {
    try {
      const accountsToClean = await listUserIntegrationAccounts(String(userId), 'google_calendar')
      for (const acc of accountsToClean) {
        try { await removeIntegrationAccount(userId, 'google_calendar', acc.accountId || 'primary') } catch {}
      }
    } catch {}
  }
}
