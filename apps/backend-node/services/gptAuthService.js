import crypto from 'crypto'
import { db } from './firebaseAdmin.js'
import { signHS256 } from '../utils/jwt.js'

const DEFAULT_CLIENT_ID = process.env.GPT_ACTION_CLIENT_ID || 'plancraft-gpt'
const DEFAULT_SCOPE = 'gpt_action'
const DEFAULT_AUDIENCE = 'plancraft_gpt_actions'
const DEFAULT_LINK_TTL_MIN = Number(process.env.GPT_LINK_CODE_TTL_MIN || 10)
const DEFAULT_ACCESS_TTL_MIN = Number(process.env.GPT_ACCESS_TOKEN_TTL_MIN || 30)
const DEFAULT_REFRESH_TTL_DAYS = Number(process.env.GPT_REFRESH_TOKEN_TTL_DAYS || 30)

const linksCollection = db.collection('gptAuthLinks')
const refreshCollection = db.collection('gptAuthTokens')

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  if (typeof value === 'number') return new Date(value)
  return new Date(value)
}

function randomUrlSafeToken(bytes = 32) {
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

function getAccessTtlSeconds(customMinutes) {
  const minutes =
    typeof customMinutes === 'number' && Number.isFinite(customMinutes)
      ? customMinutes
      : DEFAULT_ACCESS_TTL_MIN
  return Math.max(60, Math.round(minutes * 60))
}

function getRefreshExpiryDate() {
  const days = Math.max(1, Number(process.env.GPT_REFRESH_TOKEN_TTL_DAYS || DEFAULT_REFRESH_TTL_DAYS))
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

export function validateClientCredentials(clientId, secret) {
  const expectedId = DEFAULT_CLIENT_ID
  const expectedSecret = process.env.GPT_ACTION_CLIENT_SECRET
  const normalizedId = String(clientId || '').trim()
  const normalizedSecret = secret === undefined || secret === null ? null : String(secret)
  if (!normalizedId || normalizedId !== expectedId) {
    throw new Error('invalid_client')
  }
  if (expectedSecret && normalizedSecret !== expectedSecret) {
    throw new Error('invalid_client')
  }
}

export async function issueLinkCode(userId, { ttlMinutes = DEFAULT_LINK_TTL_MIN, createdBy } = {}) {
  if (!userId) throw new Error('userId required')
  const ttlMs = Math.max(1, ttlMinutes) * 60 * 1000
  const expiresAt = new Date(Date.now() + ttlMs)
  let code = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomUrlSafeToken(4).slice(0, 8).toUpperCase()
    const ref = linksCollection.doc(candidate)
    const existing = await ref.get()
    if (!existing.exists) {
      code = candidate
      await ref.set({
        userId: String(userId),
        createdBy: createdBy || null,
        createdAt: new Date(),
        expiresAt,
        consumedAt: null,
      })
      break
    }
  }
  if (!code) throw new Error('link_code_generation_failed')
  return { code, expiresAt }
}

export async function consumeLinkCode(code) {
  if (!code) throw new Error('invalid_code')
  const ref = linksCollection.doc(String(code).trim().toUpperCase())
  const snap = await ref.get()
  if (!snap.exists) throw new Error('invalid_code')
  const data = snap.data() || {}
  if (!data.userId) throw new Error('invalid_code')
  const expiresAt = toDate(data.expiresAt)
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new Error('expired_code')
  }
  if (data.consumedAt) throw new Error('code_already_used')
  await ref.set({ consumedAt: new Date() }, { merge: true })
  return { userId: data.userId, metadata: data.metadata || null }
}

function buildAccessToken(userId, { metadata = {}, ttlMinutes } = {}) {
  const secret = process.env.APP_JWT_SECRET
  if (!secret) throw new Error('app_jwt_disabled')
  const ttlSec = getAccessTtlSeconds(ttlMinutes)
  const payload = {
    sub: String(userId),
    scope: DEFAULT_SCOPE,
    aud: DEFAULT_AUDIENCE,
    metadata,
  }
  const accessToken = signHS256(payload, secret, ttlSec)
  const expiresAt = new Date(Date.now() + ttlSec * 1000)
  return { accessToken, expiresIn: ttlSec, accessExpiresAt: expiresAt }
}

export async function issueTokenPairForUser(userId, { clientId = DEFAULT_CLIENT_ID, metadata = {} } = {}) {
  if (!userId) throw new Error('userId required for token issuance')
  const refreshToken = randomUrlSafeToken(48)
  const refreshHash = hashToken(refreshToken)
  const refreshExpiresAt = getRefreshExpiryDate()
  await refreshCollection.doc(refreshHash).set({
    userId: String(userId),
    clientId,
    scope: DEFAULT_SCOPE,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt: refreshExpiresAt,
    revoked: false,
    metadata,
  })
  const { accessToken, expiresIn, accessExpiresAt } = buildAccessToken(userId, { metadata })
  return {
    accessToken,
    refreshToken,
    expiresIn,
    accessExpiresAt,
    refreshExpiresAt,
    scope: DEFAULT_SCOPE,
    tokenType: 'bearer',
  }
}

export async function exchangeRefreshToken(refreshToken, { clientId = DEFAULT_CLIENT_ID } = {}) {
  if (!refreshToken) throw new Error('invalid_refresh_token')
  const refreshHash = hashToken(refreshToken)
  const ref = refreshCollection.doc(refreshHash)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('invalid_refresh_token')
  const data = snap.data() || {}
  if (data.revoked) throw new Error('invalid_refresh_token')
  if (data.clientId && data.clientId !== clientId) throw new Error('invalid_client')
  const expiresAt = toDate(data.expiresAt)
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new Error('invalid_refresh_token')
  }
  await ref.set({ lastUsedAt: new Date() }, { merge: true })
  const { accessToken, expiresIn, accessExpiresAt } = buildAccessToken(data.userId, {
    metadata: data.metadata || {},
  })
  return {
    accessToken,
    expiresIn,
    accessExpiresAt,
    refreshToken,
    refreshExpiresAt: expiresAt || getRefreshExpiryDate(),
    scope: data.scope || DEFAULT_SCOPE,
    tokenType: 'bearer',
    userId: data.userId,
  }
}
