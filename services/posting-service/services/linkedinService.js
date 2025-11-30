import axios from 'axios'
import crypto from 'crypto'
import { getTokensByUser, saveUserTokens } from '../firestore/tokensRepository.js'

const AUTH_BASE = 'https://www.linkedin.com/oauth/v2'
const API_BASE = 'https://api.linkedin.com/v2'
const SCOPES = ['openid', 'profile', 'email', 'w_member_social']
const STATE_TTL_MS = 15 * 60 * 1000

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || ''
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URL || ''
const STATE_SECRET =
  process.env.LINKEDIN_STATE_SECRET ||
  process.env.SERVICE_APP_TOKEN ||
  process.env.APP_TOKEN ||
  process.env.LINKEDIN_CLIENT_SECRET ||
  'linkedin-state-secret'

function requireEnv() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URL')
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
  const expected = hmac(raw)
  if (expected !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (payload?.ts && Date.now() - payload.ts > STATE_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}

export function buildAuthUrl(userId, returnTo) {
  requireEnv()
  if (!userId) throw new Error('Missing user id for LinkedIn auth')
  const state = encodeState({ uid: userId, ts: Date.now(), returnTo: returnTo || null })
  const scopeParam = encodeURIComponent(SCOPES.join(' '))
  const redirectParam = encodeURIComponent(REDIRECT_URI)
  return `${AUTH_BASE}/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${redirectParam}&scope=${scopeParam}&state=${state}`
}

export async function exchangeCodeForToken(code) {
  requireEnv()
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  })
  const { data } = await axios.post(`${AUTH_BASE}/accessToken`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function refreshAccessToken(refreshToken) {
  requireEnv()
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  })
  const { data } = await axios.post(`${AUTH_BASE}/accessToken`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function fetchProfile(accessToken) {
  try {
    const { data } = await axios.get(`${API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return data
  } catch (err) {
    // Fallback: minimal profile
    try {
      const { data } = await axios.get(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return data
    } catch {
      const msg = err?.response?.data || err?.message || 'profile fetch failed'
      throw new Error(`LinkedIn profile fetch failed: ${msg}`)
    }
  }
}

export async function getLinkedInTokens(userId) {
  const tokens = await getTokensByUser(userId)
  return tokens?.linkedin || {}
}

function parseExpirySeconds(seconds) {
  if (!seconds) return null
  const ms = Number(seconds) * 1000
  if (Number.isNaN(ms)) return null
  return new Date(Date.now() + ms).toISOString()
}

export async function storeLinkedInTokens(userId, tokenPayload, profile, existingLinkedIn) {
  const linkedin = {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token || existingLinkedIn?.refreshToken || null,
    expiresAt: parseExpirySeconds(tokenPayload.expires_in) || existingLinkedIn?.expiresAt || null,
    refreshExpiresAt:
      parseExpirySeconds(tokenPayload.refresh_token_expires_in) || existingLinkedIn?.refreshExpiresAt || null,
    profile: profile ?? existingLinkedIn?.profile ?? null,
    updatedAt: new Date().toISOString(),
  }
  await saveUserTokens(userId, { linkedin })
  return linkedin
}

function isExpired(isoString) {
  if (!isoString) return false
  const ts = Date.parse(isoString)
  if (Number.isNaN(ts)) return false
  return ts <= Date.now()
}

export async function ensureAccessToken(userId) {
  let linkedin = await getLinkedInTokens(userId)
  if (!linkedin?.accessToken) throw new Error('LinkedIn not connected for this user')
  if (!isExpired(linkedin.expiresAt)) return linkedin
  if (!linkedin.refreshToken) throw new Error('LinkedIn token expired and no refresh token available')

  const refreshed = await refreshAccessToken(linkedin.refreshToken)
  const profile = linkedin.profile || null
  linkedin = await storeLinkedInTokens(userId, refreshed, profile, linkedin)
  return linkedin
}

function buildSharePayload({ author, text, mediaUrl, mediaDescription }) {
  const trimmedText = (text || '').trim() || 'Shared via PlanCraft AI'
  if (!mediaUrl) {
    return {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: trimmedText },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }
  }

  // Uses external URL as attachment. For uploads, an asset registration + upload flow is required.
  return {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: trimmedText },
        shareMediaCategory: 'ARTICLE',
        media: [
          {
            status: 'READY',
            description: { text: mediaDescription || trimmedText },
            originalUrl: mediaUrl,
            title: { text: mediaDescription || 'Shared content' },
          },
        ],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }
}

export async function postLinkedInContent({ userId, text, mediaUrl, mediaDescription }) {
  const linkedin = await ensureAccessToken(userId)
  let authorId = linkedin?.profile?.sub || linkedin?.profile?.id
  let profile = linkedin.profile

  if (!authorId) {
    profile = await fetchProfile(linkedin.accessToken)
    authorId = profile?.sub || profile?.id
    await saveUserTokens(userId, { linkedin: { ...linkedin, profile } })
  }

  const author = authorId ? `urn:li:person:${authorId}` : null
  if (!author) throw new Error('LinkedIn author id missing')

  const payload = buildSharePayload({ author, text, mediaUrl, mediaDescription })
  const { data } = await axios.post(`${API_BASE}/ugcPosts`, payload, {
    headers: {
      Authorization: `Bearer ${linkedin.accessToken}`,
      'LinkedIn-Version': '202401',
      'Content-Type': 'application/json',
    },
  })
  return { id: data?.id || null, payload }
}
