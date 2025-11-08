import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import {
  issueLinkCode,
  consumeLinkCode,
  issueTokenPairForUser,
  validateClientCredentials,
  exchangeRefreshToken,
} from '../services/gptAuthService.js'

const router = express.Router()

function normalizeGrantType(value) {
  if (!value && value !== 0) return ''
  return String(value).toLowerCase()
}

function pickField(body, variants = []) {
  if (!body) return ''
  for (const key of variants) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key]
    }
  }
  return ''
}

function extractClientCredentials(req, body) {
  let clientId = pickField(body, ['client_id', 'clientId', 'clientID', 'client-id'])
  let clientSecret = pickField(body, ['client_secret', 'clientSecret', 'client-secret'])

  if ((!clientId || !clientSecret) && req?.headers?.authorization) {
    const header = String(req.headers.authorization)
    if (/^basic\s+/i.test(header)) {
      const token = header.replace(/^basic\s+/i, '')
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf8')
        const [id, secret] = decoded.split(':')
        if (!clientId && id) clientId = id
        if (!clientSecret && secret !== undefined) clientSecret = secret
      } catch (err) {
        console.warn('[GPTAuth] failed to parse basic auth header', err?.message || err)
      }
    }
  }

  return { clientId, clientSecret }
}

function oauthError(res, code, status = 400, extra = {}) {
  res.set('Cache-Control', 'no-store')
  res.set('Pragma', 'no-cache')
  return res.status(status).json({ error: code, ...extra })
}

router.post('/gpt/auth/link', requireAuth, ensureUserMatches, async (req, res) => {
  try {
    const { userId, ttlMinutes } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const result = await issueLinkCode(userId, {
      ttlMinutes: ttlMinutes ? Number(ttlMinutes) : undefined,
      createdBy: req.user?.uid || null,
    })
    return res.status(201).json({
      ok: true,
      code: result.code,
      expiresAt: result.expiresAt,
      ttlMinutes: ttlMinutes || undefined,
    })
  } catch (err) {
    console.error('[GPTAuth] link generation failed', err?.message || err)
    return res.status(500).json({ error: 'Failed to create link code' })
  }
})

router.post('/gpt/auth', async (req, res) => {
  const body = req.body || {}
  const grantType = normalizeGrantType(body.grant_type || body.grantType)
  const { clientId, clientSecret } = extractClientCredentials(req, body)
  try {
    validateClientCredentials(clientId, clientSecret)
  } catch (err) {
    return oauthError(res, 'invalid_client', 401)
  }

  if (grantType === 'authorization_code') {
    const code = body.code || body.authorization_code
    if (!code) return oauthError(res, 'invalid_request')
    try {
      const { userId, metadata } = await consumeLinkCode(code)
      const tokens = await issueTokenPairForUser(userId, { clientId, metadata })
      res.set('Cache-Control', 'no-store')
      res.set('Pragma', 'no-cache')
      return res.json({
        token_type: tokens.tokenType,
        scope: tokens.scope,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        user_id: userId,
      })
    } catch (err) {
      const codeMap = new Set(['invalid_code', 'code_already_used', 'expired_code'])
      const isGrantIssue = codeMap.has(err?.message)
      const status = isGrantIssue ? 400 : err?.message === 'app_jwt_disabled' ? 503 : 500
      const label = isGrantIssue ? 'invalid_grant' : err?.message || 'server_error'
      console.warn('[GPTAuth] authorization_code error', err?.message || err)
      return oauthError(res, label, status)
    }
  }

  if (grantType === 'refresh_token') {
    const refreshToken = body.refresh_token || body.refreshToken
    if (!refreshToken) return oauthError(res, 'invalid_request')
    try {
      const tokens = await exchangeRefreshToken(refreshToken, { clientId })
      res.set('Cache-Control', 'no-store')
      res.set('Pragma', 'no-cache')
      return res.json({
        token_type: tokens.tokenType,
        scope: tokens.scope,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        user_id: tokens.userId,
      })
    } catch (err) {
      const label = err?.message === 'invalid_refresh_token' ? 'invalid_grant' : err?.message || 'server_error'
      const status = err?.message === 'invalid_refresh_token' ? 400 : err?.message === 'invalid_client' ? 401 : 500
      console.warn('[GPTAuth] refresh_token error', err?.message || err)
      return oauthError(res, label, status)
    }
  }

  return oauthError(res, 'unsupported_grant_type')
})

export default router
