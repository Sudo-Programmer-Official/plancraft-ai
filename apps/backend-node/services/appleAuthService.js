import crypto from 'crypto'
import fs from 'fs'
import {
  base64urlDecode,
} from '../utils/jwt.js'
import {
  createMobileAuthHandoffForUser,
  normalizeMobileAuthRedirectPath,
} from './mobileAuthHandoffService.js'
import { db } from './firebaseAdmin.js'
import { resolveAppleFirebaseUser } from './appleFirebaseLinkService.js'

const APPLE_STATE_COLLECTION = 'appleAuthStates'
const APPLE_STATE_TTL_MS = 10 * 60 * 1000
const APPLE_AUTH_ISSUER = 'https://appleid.apple.com'
const APPLE_AUTHORIZE_URL = 'https://appleid.apple.com/auth/authorize'
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token'
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys'

let appleKeysCache = {
  expiresAt: 0,
  keys: [],
}

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function base64urlEncodeBuffer(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input))
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function decodeJwtPart(part) {
  const value = base64urlDecode(part)
  return value ? JSON.parse(value) : {}
}

function stripMatchingQuotes(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1).trim()
  }
  return text
}

function normalizePemBlock(value) {
  const text = String(value || '').trim()
  if (!text.includes('-----BEGIN PRIVATE KEY-----') || !text.includes('-----END PRIVATE KEY-----')) {
    return text
  }

  const match = text.match(/-----BEGIN PRIVATE KEY-----\s*([\s\S]*?)\s*-----END PRIVATE KEY-----/)
  if (!match) return text
  const body = String(match[1] || '')
    .replace(/\s+/g, '')
    .trim()
  if (!body) return text
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`
}

function resolveApplePrivateKey() {
  const explicitPath = stripMatchingQuotes(process.env.APPLE_PRIVATE_KEY_PATH || '')
  if (explicitPath) {
    try {
      if (fs.existsSync(explicitPath)) {
        return normalizePemBlock(fs.readFileSync(explicitPath, 'utf8'))
      }
    } catch {}
  }

  const rawValue = stripMatchingQuotes(process.env.APPLE_PRIVATE_KEY || '')
  if (!rawValue) return ''

  let normalized = rawValue
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n?/g, '\n')
    .trim()

  if (!normalized.includes('-----BEGIN PRIVATE KEY-----') && fs.existsSync(normalized)) {
    try {
      normalized = fs.readFileSync(normalized, 'utf8')
    } catch {}
  }

  return normalizePemBlock(normalized)
}

function getAppleAuthConfig() {
  const config = {
    teamId: String(process.env.APPLE_TEAM_ID || '').trim(),
    clientId: String(process.env.APPLE_CLIENT_ID || '').trim(),
    keyId: String(process.env.APPLE_KEY_ID || '').trim(),
    privateKey: resolveApplePrivateKey(),
    redirectUri: String(process.env.APPLE_REDIRECT_URI || '').trim(),
    enabled: isEnabled(process.env.APPLE_SERVER_AUTH_ENABLED),
  }

  const missing = []
  if (!config.teamId) missing.push('APPLE_TEAM_ID')
  if (!config.clientId) missing.push('APPLE_CLIENT_ID')
  if (!config.keyId) missing.push('APPLE_KEY_ID')
  if (!config.privateKey) missing.push('APPLE_PRIVATE_KEY')
  if (!config.redirectUri) missing.push('APPLE_REDIRECT_URI')
  return {
    ...config,
    missing,
    ready: config.enabled && missing.length === 0,
  }
}

export function isServerDrivenAppleMobileAuthEnabled() {
  return getAppleAuthConfig().ready
}

function getCallbackFailureUrl(errorCode = 'apple_auth_failed') {
  const params = new URLSearchParams()
  params.set('appleAuthError', String(errorCode || 'apple_auth_failed'))
  return `plancraftai://localhost/login?${params.toString()}`
}

function buildCallbackSuccessUrl({ code, redirect }) {
  const params = new URLSearchParams()
  if (code) params.set('code', code)
  params.set('redirect', normalizeMobileAuthRedirectPath(redirect))
  return `plancraftai://localhost/app-auth/complete?${params.toString()}`
}

function buildAppleClientSecret(config) {
  const header = {
    alg: 'ES256',
    kid: config.keyId,
  }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: config.teamId,
    iat: now,
    exp: now + (5 * 60),
    aud: APPLE_AUTH_ISSUER,
    sub: config.clientId,
  }
  const encodedHeader = base64urlEncodeBuffer(JSON.stringify(header))
  const encodedPayload = base64urlEncodeBuffer(JSON.stringify(payload))
  const unsigned = `${encodedHeader}.${encodedPayload}`
  let signature
  try {
    signature = crypto.sign(
      'sha256',
      Buffer.from(unsigned),
      crypto.createPrivateKey(config.privateKey),
    )
  } catch (error) {
    const err = new Error('Apple private key is invalid or improperly formatted')
    err.code = 'apple_key_invalid'
    err.status = 500
    err.cause = error
    throw err
  }
  return `${unsigned}.${base64urlEncodeBuffer(signature)}`
}

async function fetchAppleKeys() {
  if (appleKeysCache.expiresAt > Date.now() && Array.isArray(appleKeysCache.keys) && appleKeysCache.keys.length) {
    return appleKeysCache.keys
  }
  const response = await fetch(APPLE_KEYS_URL, { method: 'GET' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !Array.isArray(data?.keys)) {
    throw new Error('Failed to fetch Apple signing keys')
  }
  appleKeysCache = {
    keys: data.keys,
    expiresAt: Date.now() + (60 * 60 * 1000),
  }
  return appleKeysCache.keys
}

async function verifyAppleIdentityToken(idToken, config) {
  const token = String(idToken || '').trim()
  if (!token) throw new Error('Missing Apple identity token')

  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Malformed Apple identity token')
  }

  const header = decodeJwtPart(encodedHeader)
  const claims = decodeJwtPart(encodedPayload)
  const keys = await fetchAppleKeys()
  const appleKey = keys.find((entry) => entry?.kid === header?.kid)
  if (!appleKey) {
    throw new Error(`Apple signing key not found for kid ${header?.kid || 'unknown'}`)
  }

  const verifier = crypto.createPublicKey({
    key: appleKey,
    format: 'jwk',
  })
  const signature = Buffer.from(
    encodedSignature.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedSignature.length / 4) * 4, '='),
    'base64',
  )
  const valid = crypto.verify(
    'sha256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    verifier,
    signature,
  )
  if (!valid) throw new Error('Apple identity token signature invalid')

  const now = Math.floor(Date.now() / 1000)
  if (claims?.iss !== APPLE_AUTH_ISSUER) {
    throw new Error('Apple identity token issuer invalid')
  }
  if (claims?.aud !== config.clientId) {
    throw new Error('Apple identity token audience invalid')
  }
  if (!claims?.exp || Number(claims.exp) <= now) {
    throw new Error('Apple identity token expired')
  }
  if (!claims?.sub) {
    throw new Error('Apple identity token missing subject')
  }

  return claims
}

function parseAppleUserPayload(rawUser) {
  if (!rawUser) return null
  if (typeof rawUser === 'object') return rawUser
  try {
    const parsed = JSON.parse(String(rawUser))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

async function createAppleAuthState({ redirect = '/dashboard', platform = 'ios' } = {}) {
  const state = crypto.randomBytes(24).toString('hex')
  const nonce = crypto.randomBytes(16).toString('hex')
  const now = Date.now()
  const expiresAt = now + APPLE_STATE_TTL_MS
  await db.collection(APPLE_STATE_COLLECTION).doc(state).set({
    redirect: normalizeMobileAuthRedirectPath(redirect),
    platform: String(platform || 'ios'),
    nonce,
    createdAt: now,
    expiresAt,
  })
  return {
    state,
    nonce,
    redirect: normalizeMobileAuthRedirectPath(redirect),
    platform: String(platform || 'ios'),
    expiresAt,
  }
}

async function consumeAppleAuthState(state) {
  const normalizedState = String(state || '').trim()
  if (!normalizedState) throw new Error('Missing Apple auth state')

  const ref = db.collection(APPLE_STATE_COLLECTION).doc(normalizedState)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new Error('Apple auth state not found')
  }

  const data = snap.data() || {}
  const expiresAt = Number(data.expiresAt || 0)
  try { await ref.delete() } catch {}
  if (!expiresAt || expiresAt < Date.now()) {
    throw new Error('Apple auth state expired')
  }
  return {
    redirect: normalizeMobileAuthRedirectPath(String(data.redirect || '/dashboard')),
    platform: String(data.platform || 'ios'),
    nonce: String(data.nonce || ''),
  }
}

async function exchangeAppleCodeForTokens({ code, config }) {
  console.info('[AppleAuth] token exchange start', {
    redirectUri: config.redirectUri,
    hasCode: !!code,
  })
  const clientSecret = buildAppleClientSecret(config)
  const payload = new URLSearchParams({
    client_id: config.clientId,
    client_secret: clientSecret,
    code: String(code || ''),
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  })

  const response = await fetch(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString(),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(String(data?.error || data?.error_description || response.statusText || 'Apple token exchange failed'))
    error.status = response.status
    error.responseData = data
    throw error
  }
  if (!data?.id_token) {
    throw new Error('Apple token exchange missing id_token')
  }
  console.info('[AppleAuth] token exchange success', {
    hasAccessToken: !!data?.access_token,
    hasIdToken: !!data?.id_token,
    tokenType: data?.token_type || null,
  })
  return data
}

export async function createAppleMobileAuthStart({
  redirect = '/dashboard',
  platform = 'ios',
} = {}) {
  const config = getAppleAuthConfig()
  if (!config.enabled) {
    const err = new Error('Server-driven Apple mobile auth disabled')
    err.status = 503
    throw err
  }
  if (!config.ready) {
    const err = new Error(`Apple auth config missing: ${config.missing.join(', ')}`)
    err.status = 500
    throw err
  }

  const authState = await createAppleAuthState({ redirect, platform })
  console.info('[AppleAuth] start created state', {
    state: authState.state,
    platform: authState.platform,
    redirect: authState.redirect,
  })
  const url = new URL(APPLE_AUTHORIZE_URL)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('response_mode', 'form_post')
  url.searchParams.set('scope', 'name email')
  url.searchParams.set('state', authState.state)
  url.searchParams.set('nonce', authState.nonce)

  return {
    authorizeUrl: url.toString(),
    state: authState.state,
    redirect: authState.redirect,
    platform: authState.platform,
  }
}

export async function completeAppleMobileAuthCallback({
  state,
  code,
  user: rawUser,
} = {}) {
  const config = getAppleAuthConfig()
  if (!config.enabled) {
    const err = new Error('Server-driven Apple mobile auth disabled')
    err.status = 503
    throw err
  }
  if (!config.ready) {
    const err = new Error(`Apple auth config missing: ${config.missing.join(', ')}`)
    err.status = 500
    throw err
  }

  const authState = await consumeAppleAuthState(state)
  const tokenSet = await exchangeAppleCodeForTokens({ code, config })
  const claims = await verifyAppleIdentityToken(tokenSet.id_token, config)
  if (authState?.nonce && claims?.nonce && claims.nonce !== authState.nonce) {
    throw new Error('Apple identity token nonce invalid')
  }
  const appleUser = parseAppleUserPayload(rawUser)
  console.info('[AppleAuth] callback verified identity', {
    subject: claims?.sub || null,
    email: claims?.email || null,
    platform: authState.platform,
    redirect: authState.redirect,
  })

  const resolvedUser = await resolveAppleFirebaseUser({
    claims,
    appleIdToken: tokenSet.id_token,
    appleUser,
    requestUri: config.redirectUri,
  })
  console.info('[AppleAuth] user mapping complete', {
    uid: resolvedUser.uid,
    email: resolvedUser.email || null,
    providerLinked: resolvedUser.providerLinked === true,
    source: resolvedUser.source || 'unknown',
  })

  const handoff = await createMobileAuthHandoffForUser({
    uid: resolvedUser.uid,
    email: resolvedUser.email || claims?.email || null,
    redirect: authState.redirect,
    provider: 'apple',
    platform: authState.platform || 'ios',
  })
  console.info('[AppleAuth] handoff create success', {
    uid: resolvedUser.uid,
    platform: handoff.platform,
    redirect: handoff.redirect,
    handoffCode: !!handoff.code,
  })

  return {
    authState,
    tokenSet,
    claims,
    resolvedUser,
    handoff,
    appRedirectUrl: buildCallbackSuccessUrl({
      code: handoff.code,
      redirect: handoff.redirect,
    }),
  }
}

export function buildAppleMobileAuthFailureUrl(errorCode = 'apple_auth_failed') {
  return getCallbackFailureUrl(errorCode)
}
