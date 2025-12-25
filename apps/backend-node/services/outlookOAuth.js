import { db } from './firebaseAdmin.js'
import crypto from 'crypto'
import nodeFetch from 'node-fetch'
import { upsertIntegrationAccount, updateIntegrationAccountTokens, removeIntegrationAccount, listUserIntegrationAccounts } from './integrationAccountService.js'
import { deleteExternalEventsForAccount } from './externalEventsService.js'

const OUTLOOK_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me'
const GRAPH_CALENDARS_URL = 'https://graph.microsoft.com/v1.0/me/calendars'

export const OUTLOOK_SCOPES = [
  'offline_access',
  'https://graph.microsoft.com/Calendars.Read',
  'https://graph.microsoft.com/User.Read',
]

const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : nodeFetch

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

export function normalizeOutlookIntegration(data = {}) {
  const accs = Array.isArray(data.accounts) ? data.accounts.map((a) => normalizeAccount(a, data.primaryAccountId || 'primary')) : []
  if (!accs.length && (data.token || data.connected)) {
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

async function fetchOutlookProfile(tokens) {
  if (!tokens?.access_token) return null
  try {
    const resp = await fetchFn(GRAPH_ME_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}

async function listOutlookCalendars(tokens) {
  if (!tokens?.access_token) return []
  const headers = { Authorization: `Bearer ${tokens.access_token}` }
  const resp = await fetchFn(GRAPH_CALENDARS_URL, { headers })
  if (!resp.ok) return []
  const json = await resp.json()
  const items = Array.isArray(json?.value) ? json.value : []
  return items.map((cal) => ({
    id: cal.id,
    summary: cal.name || cal.id,
    timeZone: cal.timeZone || cal.timezone || null,
    primary: cal.isDefaultCalendar === true,
    selected: cal.isDefaultCalendar === true,
  }))
}

async function mintState(userId, ttlSeconds = 600) {
  const nonce = crypto.randomBytes(16).toString('hex')
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + Math.max(60, Math.min(ttlSeconds, 3600))
  const payload = `o1.${userId}.${nonce}.${exp}`
  const secret = getStateSecret()
  const sig = sign(payload, secret)
  const token = `${payload}.${sig}`
  try {
    await db.collection('oauth_state').doc(`o_${nonce}`).set({
      userId: String(userId),
      provider: 'outlook',
      nonce,
      iat,
      exp,
      createdAt: new Date(),
    })
  } catch {}
  return token
}

export async function parseAndVerifyState(state) {
  try {
    const parts = String(state || '').split('.')
    if (parts.length !== 5) return null
    const [v, userId, nonce, expStr, sig] = parts
    if (v !== 'o1' || !userId || !nonce || !expStr || !sig) return null
    const payload = `${v}.${userId}.${nonce}.${expStr}`
    const expected = sign(payload, getStateSecret())
    if (expected !== sig) return null
    const exp = parseInt(expStr, 10)
    if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) return null
    // one-time use
    try {
      const ref = db.collection('oauth_state').doc(`o_${nonce}`)
      const snap = await ref.get()
      if (!snap.exists) return null
      const data = snap.data() || {}
      if (String(data.userId) !== String(userId)) return null
      await ref.delete().catch(() => {})
    } catch {}
    return { userId }
  } catch {
    return null
  }
}

export async function buildOutlookConsentUrl(userId) {
  const client_id = getEnv('OUTLOOK_CLIENT_ID')
  const redirect_uri = getEnv('OUTLOOK_REDIRECT_URI')
  if (!client_id || !redirect_uri) throw new Error('Missing OUTLOOK_CLIENT_ID or OUTLOOK_REDIRECT_URI')
  const state = await mintState(String(userId))
  const params = new URLSearchParams({
    client_id,
    response_type: 'code',
    redirect_uri,
    response_mode: 'query',
    scope: OUTLOOK_SCOPES.join(' '),
    state,
    prompt: 'select_account',
  })
  return `${OUTLOOK_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code) {
  const client_id = getEnv('OUTLOOK_CLIENT_ID')
  const client_secret = getEnv('OUTLOOK_CLIENT_SECRET')
  const redirect_uri = getEnv('OUTLOOK_REDIRECT_URI')
  if (!client_id || !client_secret || !redirect_uri) throw new Error('Missing Outlook OAuth credentials')
  const body = new URLSearchParams({
    client_id,
    client_secret,
    redirect_uri,
    code,
    grant_type: 'authorization_code',
    scope: OUTLOOK_SCOPES.join(' '),
  })
  const resp = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Outlook token exchange failed: ${resp.status} ${text}`)
  }
  const json = await resp.json()
  const expiry_date = json.expires_in ? Date.now() + Number(json.expires_in) * 1000 : undefined
  return { ...json, expiry_date }
}

export async function refreshOutlookAccessToken(refresh_token) {
  const client_id = getEnv('OUTLOOK_CLIENT_ID')
  const client_secret = getEnv('OUTLOOK_CLIENT_SECRET')
  if (!client_id || !client_secret || !refresh_token) throw new Error('Missing Outlook refresh token')
  const body = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token,
    grant_type: 'refresh_token',
    scope: OUTLOOK_SCOPES.join(' '),
  })
  const resp = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Outlook token refresh failed: ${resp.status} ${text}`)
  }
  const json = await resp.json()
  const expiry_date = json.expires_in ? Date.now() + Number(json.expires_in) * 1000 : undefined
  return { ...json, expiry_date, refresh_token }
}

export async function getUserOutlookIntegration(userId) {
  const doc = await db.collection('users').doc(String(userId)).get()
  const data = doc.exists ? doc.data() : {}
  return normalizeOutlookIntegration((data?.integrations?.outlook) || {})
}

export async function saveUserOutlookIntegration(userId, integration) {
  const normalized = normalizeOutlookIntegration(integration || {})
  const payload = { integrations: { outlook: normalized }, updatedAt: new Date() }
  await db.collection('users').doc(String(userId)).set(payload, { merge: true })
  return normalized
}

export async function saveUserOutlookTokens(userId, tokens, accountMeta = {}) {
  const integ = (await getUserOutlookIntegration(userId)) || normalizeOutlookIntegration({})
  const profile = accountMeta.profile || (await fetchOutlookProfile(tokens))
  const accountEmail = accountMeta.accountEmail || profile?.mail || profile?.userPrincipalName || null
  const accountId = cleanAccountId(accountMeta.accountId || accountEmail || profile?.id || integ.primaryAccountId || 'primary')
  const existingIdx = Array.isArray(integ.accounts) ? integ.accounts.findIndex((a) => a.accountId === accountId) : -1
  const existing = existingIdx >= 0 ? integ.accounts[existingIdx] : null
  const refreshToken = tokens?.refresh_token || existing?.token?.refresh_token || integ?.token?.refresh_token || null
  let calendars = Array.isArray(accountMeta.calendars) ? accountMeta.calendars : []
  if (!calendars.length) {
    try {
      calendars = await listOutlookCalendars(tokens)
    } catch {}
  }
  if (!calendars.length && Array.isArray(existing?.calendars)) {
    calendars = existing.calendars
  }
  if (!calendars.length) {
    calendars = [{ id: 'primary', summary: 'Outlook Calendar', selected: true }]
  }

  const mergedAccount = normalizeAccount(
    {
      ...(existing || {}),
      accountId,
      accountEmail: accountEmail || existing?.accountEmail || null,
      token: { ...tokens, refresh_token: refreshToken },
      calendars,
      connected: true,
      primary: accountMeta.primary === true || existing?.primary || (!integ.primaryAccountId && existingIdx <= 0),
      scopes: Array.from(new Set([...(existing?.scopes || []), ...(tokens?.scope ? String(tokens.scope).split(' ') : []), ...OUTLOOK_SCOPES])),
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
    scopes: Array.from(new Set([...(integ.scopes || []), ...(tokens?.scope ? String(tokens.scope).split(' ') : []), ...OUTLOOK_SCOPES])),
    updatedAt: new Date(),
  }

  const normalized = await saveUserOutlookIntegration(userId, mergedIntegration)
  try {
    await upsertIntegrationAccount({
      userId: String(userId),
      provider: 'outlook_calendar',
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
    console.warn('[OutlookOAuth] Failed to upsert integration account', err?.message || err)
  }
  return normalized
}

export async function ensureFreshOutlookAccessToken(userId, accountId = null) {
  const integ = (await getUserOutlookIntegration(userId)) || normalizeOutlookIntegration({})
  const targetId = cleanAccountId(accountId || integ.primaryAccountId || integ.accounts?.[0]?.accountId || 'primary')
  const account = (integ.accounts || []).find((a) => a.accountId === targetId) || integ.accounts?.[0] || null
  const token = account?.token || {}
  const now = Date.now()
  let current = token
  if (!current?.access_token) throw new Error('No access token; reconnect Outlook')
  if (current?.expiry_date && Number(current.expiry_date) - 60000 < now) {
    const refreshed = await refreshOutlookAccessToken(current.refresh_token)
    current = { ...current, ...refreshed }
    await saveUserOutlookTokens(userId, current, { accountId: targetId, accountEmail: account?.accountEmail || null })
    try {
      await updateIntegrationAccountTokens(userId, 'outlook_calendar', {
        accountId: targetId,
        accessToken: current.access_token,
        refreshToken: current.refresh_token,
        tokenExpiry: current.expiry_date,
      })
    } catch {}
  }
  return { tokens: current, integration: integ, account: account || null }
}

export async function disconnectOutlookIntegration(userId, accountId = null) {
  if (!userId) return
  const integ = (await getUserOutlookIntegration(userId)) || normalizeOutlookIntegration({})
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

  await saveUserOutlookIntegration(userId, updated)
  for (const acc of removed) {
    const aid = acc.accountId || 'primary'
    try {
      await removeIntegrationAccount(userId, 'outlook_calendar', aid)
    } catch (err) {
      console.warn('[OutlookOAuth] removeIntegrationAccount failed', err?.message || err)
    }
    try {
      await deleteExternalEventsForAccount(userId, 'outlook_calendar', aid)
    } catch (err) {
      console.warn('[OutlookOAuth] deleteExternalEventsForAccount failed', err?.message || err)
    }
  }
  if (!targetId) {
    try {
      const accountsToClean = await listUserIntegrationAccounts(String(userId), 'outlook_calendar')
      for (const acc of accountsToClean) {
        try {
          await removeIntegrationAccount(userId, 'outlook_calendar', acc.accountId || 'primary')
        } catch {}
      }
    } catch {}
  }
}
