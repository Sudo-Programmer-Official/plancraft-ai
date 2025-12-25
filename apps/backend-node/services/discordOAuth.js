import crypto from 'crypto'
import nodeFetch from 'node-fetch'
import { db } from './firebaseAdmin.js'

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize'
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'
const DISCORD_ME_URL = 'https://discord.com/api/users/@me'
const DISCORD_GUILDS_URL = 'https://discord.com/api/users/@me/guilds'
const BOT_PERMISSIONS = process.env.DISCORD_BOT_PERMISSIONS || '18432' // Send Messages + Embed Links

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

function cleanId(raw, fallback = 'primary') {
  const value = String(raw || fallback || '').trim() || 'primary'
  return value.replace(/[^a-zA-Z0-9@._-]/g, '_').slice(0, 120)
}

export function normalizeDiscordIntegration(raw = {}) {
  const notifyOn = raw.notifyOn || {}
  return {
    connected: raw.connected !== false && !!(raw.accessToken || raw.refreshToken || raw.discordUserId),
    discordUserId: raw.discordUserId || null,
    username: raw.username || null,
    avatar: raw.avatar || null,
    accessToken: raw.accessToken || null,
    refreshToken: raw.refreshToken || null,
    scopes: Array.isArray(raw.scopes) ? raw.scopes : [],
    guilds: Array.isArray(raw.guilds) ? raw.guilds : [],
    defaultChannelId: raw.defaultChannelId || null,
    notifyOn: {
      reminders: notifyOn.reminders !== false,
      deadlines: notifyOn.deadlines === true,
      dailySummary: notifyOn.dailySummary === true,
    },
    updatedAt: raw.updatedAt || new Date(),
  }
}

async function mintState(userId, ttlSeconds = 600) {
  const nonce = crypto.randomBytes(16).toString('hex')
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + Math.max(60, Math.min(ttlSeconds, 3600))
  const payload = `d1.${userId}.${nonce}.${exp}`
  const secret = getStateSecret()
  const sig = sign(payload, secret)
  const token = `${payload}.${sig}`
  try {
    await db.collection('oauth_state').doc(`d_${nonce}`).set({
      userId: String(userId),
      provider: 'discord',
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
    if (v !== 'd1' || !userId || !nonce || !expStr || !sig) return null
    const payload = `${v}.${userId}.${nonce}.${expStr}`
    const expected = sign(payload, getStateSecret())
    if (expected !== sig) return null
    const exp = parseInt(expStr, 10)
    if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) return null
    try {
      const ref = db.collection('oauth_state').doc(`d_${nonce}`)
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

export async function buildDiscordConsentUrl(userId) {
  const client_id = getEnv('DISCORD_CLIENT_ID')
  const redirect_uri = getEnv('DISCORD_REDIRECT_URI')
  if (!client_id || !redirect_uri) throw new Error('Missing DISCORD_CLIENT_ID or DISCORD_REDIRECT_URI')
  const state = await mintState(String(userId))
  const scopes = ['identify', 'email', 'guilds', 'bot']
  const params = new URLSearchParams({
    client_id,
    redirect_uri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    permissions: BOT_PERMISSIONS,
  })
  return `${DISCORD_AUTH_URL}?${params.toString()}`
}

export async function exchangeDiscordCode(code) {
  const client_id = getEnv('DISCORD_CLIENT_ID')
  const client_secret = getEnv('DISCORD_CLIENT_SECRET')
  const redirect_uri = getEnv('DISCORD_REDIRECT_URI')
  if (!client_id || !client_secret || !redirect_uri) throw new Error('Missing Discord OAuth credentials')
  const body = new URLSearchParams({
    client_id,
    client_secret,
    grant_type: 'authorization_code',
    code,
    redirect_uri,
  })
  const resp = await fetchFn(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Discord token exchange failed: ${resp.status} ${text}`)
  }
  const json = await resp.json()
  return json
}

async function fetchDiscordProfile(accessToken) {
  if (!accessToken) return null
  const resp = await fetchFn(DISCORD_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) return null
  return await resp.json()
}

async function fetchDiscordGuilds(accessToken) {
  if (!accessToken) return []
  const resp = await fetchFn(DISCORD_GUILDS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) return []
  const json = await resp.json()
  return Array.isArray(json)
    ? json.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon || null,
        permissions: g.permissions || null,
      }))
    : []
}

export async function saveDiscordIntegration(userId, payload = {}) {
  const normalized = normalizeDiscordIntegration(payload)
  await db.collection('users').doc(String(userId)).set(
    { 'integrations.discord': normalized, updatedAt: new Date() },
    { merge: true },
  )
  return normalized
}

export async function getDiscordIntegration(userId) {
  const snap = await db.collection('users').doc(String(userId)).get()
  const data = snap.exists ? snap.data() : {}
  return normalizeDiscordIntegration(data?.integrations?.discord || {})
}

export async function saveDiscordTokens(userId, tokens) {
  const profile = await fetchDiscordProfile(tokens?.access_token)
  const guilds = await fetchDiscordGuilds(tokens?.access_token)
  const scopes = tokens?.scope ? String(tokens.scope).split(' ') : []
  const payload = {
    discordUserId: profile?.id || null,
    username: profile ? `${profile.username}${profile.discriminator && profile.discriminator !== '0' ? `#${profile.discriminator}` : ''}` : null,
    avatar: profile?.avatar || null,
    email: profile?.email || null,
    accessToken: tokens?.access_token || null,
    refreshToken: tokens?.refresh_token || null,
    scopes,
    guilds,
    connected: true,
    updatedAt: new Date(),
  }
  return saveDiscordIntegration(userId, payload)
}

export async function disconnectDiscord(userId) {
  if (!userId) return
  const cleared = normalizeDiscordIntegration({
    connected: false,
    discordUserId: null,
    username: null,
    avatar: null,
    accessToken: null,
    refreshToken: null,
    scopes: [],
    guilds: [],
    defaultChannelId: null,
  })
  await db.collection('users').doc(String(userId)).set({ 'integrations.discord': cleared, updatedAt: new Date() }, { merge: true })
}
