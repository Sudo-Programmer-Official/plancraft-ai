import axios from 'axios'
import crypto from 'crypto'
import { getTokensByUser, saveUserTokens } from '../firestore/tokensRepository.js'

const FB_OAUTH = 'https://www.facebook.com/v18.0/dialog/oauth'
const GRAPH = 'https://graph.facebook.com/v18.0'

const APP_ID = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || ''
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || ''
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URL || ''
const SCOPES =
  process.env.INSTAGRAM_SCOPES ||
  'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement'

const STATE_SECRET =
  process.env.OAUTH_STATE_SECRET ||
  process.env.SERVICE_APP_TOKEN ||
  process.env.APP_TOKEN ||
  process.env.INSTAGRAM_APP_SECRET ||
  'oauth-state-secret'
const STATE_TTL_MS = (Number(process.env.OAUTH_STATE_TTL_SECONDS || '900') || 900) * 1000

function requireEnv() {
  if (!APP_ID || !APP_SECRET || !REDIRECT_URI) {
    throw new Error('Instagram OAuth not configured. Set INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URL')
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

export function buildAuthUrl(userId, returnTo) {
  requireEnv()
  if (!userId) throw new Error('Missing user id for Instagram auth')
  const state = encodeState({ uid: userId, ts: Date.now(), returnTo: returnTo || null })
  const redirectParam = encodeURIComponent(REDIRECT_URI)
  const scopeParam = encodeURIComponent(SCOPES)
  return `${FB_OAUTH}?client_id=${APP_ID}&redirect_uri=${redirectParam}&scope=${scopeParam}&response_type=code&state=${state}`
}

async function exchangeCodeForShortLived(code) {
  const { data } = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      client_id: APP_ID,
      client_secret: APP_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    },
  })
  return data
}

async function exchangeForLongLived(shortToken) {
  const { data } = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: APP_ID,
      client_secret: APP_SECRET,
      fb_exchange_token: shortToken,
    },
  })
  return data
}

async function fetchPages(accessToken) {
  const { data } = await axios.get(`${GRAPH}/me/accounts`, {
    params: { access_token: accessToken, fields: 'id,name,access_token,instagram_business_account' },
  })
  return data?.data || []
}

async function fetchIgProfile(businessId, accessToken) {
  if (!businessId) return null
  try {
    const { data } = await axios.get(`${GRAPH}/${businessId}`, {
      params: { fields: 'username,profile_picture_url', access_token: accessToken },
    })
    return data
  } catch {
    return null
  }
}

function parseExpiry(seconds) {
  if (!seconds) return null
  const ms = Number(seconds) * 1000
  if (Number.isNaN(ms)) return null
  return new Date(Date.now() + ms).toISOString()
}

export async function handleInstagramCallback(code, requestedPageId) {
  requireEnv()
  const short = await exchangeCodeForShortLived(code)
  const long = await exchangeForLongLived(short.access_token)
  const pages = await fetchPages(long.access_token)
  if (!pages.length) throw new Error('No Facebook pages with Instagram business account found')

  let page = pages.find((p) => p.id === requestedPageId) || pages.find((p) => p.instagram_business_account)
  if (!page) page = pages[0]

  const pageAccessToken = page.access_token
  const pageId = page.id
  const igBusinessId = page.instagram_business_account?.id || null
  const profile = await fetchIgProfile(igBusinessId, pageAccessToken)

  return {
    accessToken: pageAccessToken,
    refreshToken: null, // long-lived page tokens are refreshed via reauth
    expiresAt: parseExpiry(long.expires_in),
    refreshExpiresAt: null,
    meta: {
      pageId,
      pageName: page.name || null,
      igBusinessId,
      username: profile?.username || null,
      avatar: profile?.profile_picture_url || null,
    },
  }
}

export async function storeInstagramTokens(userId, tokenObj) {
  const instagram = {
    accessToken: tokenObj.accessToken,
    refreshToken: tokenObj.refreshToken || null,
    expiresAt: tokenObj.expiresAt || null,
    refreshExpiresAt: tokenObj.refreshExpiresAt || null,
    meta: tokenObj.meta || null,
    updatedAt: new Date().toISOString(),
  }
  await saveUserTokens(userId, { instagram })
  return instagram
}

export async function getInstagramTokens(userId) {
  const tokens = await getTokensByUser(userId)
  return tokens?.instagram || null
}

function isExpired(iso) {
  if (!iso) return false
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return false
  return ts <= Date.now()
}

export async function ensureInstagramAccess(userId) {
  const tokens = await getInstagramTokens(userId)
  if (!tokens?.accessToken) throw new Error('Instagram not connected for this user')
  // Long-lived tokens cannot be refreshed via API; require re-auth on expiry
  if (isExpired(tokens.expiresAt)) throw new Error('Instagram token expired, please reconnect')
  return tokens
}

async function createMedia(igBusinessId, accessToken, { mediaUrl, caption, isVideo }) {
  const params = {
    access_token: accessToken,
    caption: caption || '',
  }
  if (isVideo) {
    params.video_url = mediaUrl
    params.media_type = 'VIDEO'
  } else {
    params.image_url = mediaUrl
  }
  const { data } = await axios.post(`${GRAPH}/${igBusinessId}/media`, null, { params })
  return data?.id
}

async function publishMedia(igBusinessId, accessToken, creationId) {
  const { data } = await axios.post(`${GRAPH}/${igBusinessId}/media_publish`, null, {
    params: { creation_id: creationId, access_token: accessToken },
  })
  return data
}

export async function postInstagramContent({ userId, caption, mediaUrl, isVideo = false }) {
  const tokens = await ensureInstagramAccess(userId)
  const igBusinessId = tokens.meta?.igBusinessId
  if (!igBusinessId) throw new Error('Instagram business account id missing')
  if (!mediaUrl) throw new Error('Instagram mediaUrl is required (photo or video)')

  const creationId = await createMedia(igBusinessId, tokens.accessToken, { mediaUrl, caption, isVideo })
  const result = await publishMedia(igBusinessId, tokens.accessToken, creationId)
  return { id: result?.id || creationId, creationId }
}
