import axios from 'axios'
import crypto from 'crypto'
import { getTokensByUser, saveUserTokens } from '../firestore/tokensRepository.js'

const AUTH_BASE = 'https://twitter.com'
const API_BASE = 'https://api.twitter.com'
const CLIENT_ID = process.env.TWITTER_CLIENT_ID || ''
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.TWITTER_REDIRECT_URL || ''
const SCOPES = process.env.TWITTER_SCOPES || 'tweet.read tweet.write users.read offline.access'

const STATE_SECRET =
  process.env.OAUTH_STATE_SECRET ||
  process.env.SERVICE_APP_TOKEN ||
  process.env.APP_TOKEN ||
  process.env.TWITTER_CLIENT_SECRET ||
  'oauth-state-secret'
const STATE_TTL_MS = (Number(process.env.OAUTH_STATE_TTL_SECONDS || '900') || 900) * 1000

function requireEnv() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('Twitter OAuth not configured. Set TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, TWITTER_REDIRECT_URL')
  }
}

function hmac(raw) {
  return crypto.createHmac('sha256', STATE_SECRET).update(raw).digest('hex')
}

function encodeState(payload) {
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = hmac(raw)
  return `${raw}.${sig}`
}

export function decodeState(state) {
  if (!state || typeof state !== 'string') return null
  const [raw, sig] = state.split('.')
  if (!raw || !sig) return null
  if (hmac(raw) !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (payload?.ts && Date.now() - payload.ts > STATE_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}

function base64UrlEncode(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(64))
}

function codeChallengeFromVerifier(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return base64UrlEncode(hash)
}

export function buildAuthUrl(userId, workspaceId, returnTo) {
  requireEnv()
  if (!userId) throw new Error('Missing user id for Twitter auth')
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = codeChallengeFromVerifier(codeVerifier)
  const state = encodeState({
    uid: userId,
    workspaceId: workspaceId || null,
    ts: Date.now(),
    returnTo: returnTo || null,
    cv: codeVerifier,
  })
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${AUTH_BASE}/i/oauth2/authorize?${params.toString()}`
}

async function tokenRequest(params) {
  const body = new URLSearchParams({ ...params, client_id: CLIENT_ID })
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const { data } = await axios.post(`${API_BASE}/2/oauth2/token`, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
  })
  return data
}

export async function exchangeCodeForToken(code, codeVerifier) {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  })
}

export async function refreshAccessToken(refreshToken) {
  return tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

export async function fetchTwitterProfile(accessToken) {
  const { data } = await axios.get(`${API_BASE}/2/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data?.data || null
}

function parseExpiry(seconds) {
  if (!seconds) return null
  const ms = Number(seconds) * 1000
  if (Number.isNaN(ms)) return null
  return new Date(Date.now() + ms).toISOString()
}

export async function storeTwitterTokens(userId, workspaceId, tokenPayload, profile, existing) {
  const twitter = {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token || existing?.refreshToken || null,
    expiresAt: parseExpiry(tokenPayload.expires_in) || existing?.expiresAt || null,
    refreshExpiresAt: existing?.refreshExpiresAt || null,
    meta: {
      id: profile?.id || existing?.meta?.id || null,
      username: profile?.username || existing?.meta?.username || null,
      name: profile?.name || existing?.meta?.name || null,
    },
    updatedAt: new Date().toISOString(),
  }
  await saveUserTokens(userId, { twitter }, workspaceId || null)
  return twitter
}

export async function getTwitterTokens(userId, workspaceId = null) {
  const tokens = await getTokensByUser(userId, workspaceId || null)
  return tokens?.twitter || null
}

function isExpired(iso) {
  if (!iso) return false
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return false
  return ts <= Date.now()
}

export async function ensureTwitterAccess(userId, workspaceId = null) {
  let tokens = await getTwitterTokens(userId, workspaceId)
  if (!tokens?.accessToken) throw new Error('Twitter not connected for this user')
  if (!isExpired(tokens.expiresAt)) return tokens
  if (!tokens.refreshToken) throw new Error('Twitter token expired, please reconnect')
  const refreshed = await refreshAccessToken(tokens.refreshToken)
  const profile = tokens.meta || null
  tokens = await storeTwitterTokens(userId, workspaceId, refreshed, profile, tokens)
  return tokens
}

export async function postTweet({ userId, workspaceId = null, text }) {
  if (!text) throw new Error('Tweet text is required')
  const tokens = await ensureTwitterAccess(userId, workspaceId)
  const { data } = await axios.post(
    `${API_BASE}/2/tweets`,
    { text },
    { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
  )
  return data
}
