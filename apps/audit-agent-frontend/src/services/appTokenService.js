// src/services/appTokenService.js
import api from '@/services/api'
import { auth } from '@/firebase/init'

// Store keys
const KEY_TOKEN = 'app_token'
const KEY_EXP = 'app_token_exp'
const KEY_UID = 'app_token_uid'
let DISABLED = false

export function getAppToken() {
  try {
    const token = localStorage.getItem(KEY_TOKEN)
    const exp = parseInt(localStorage.getItem(KEY_EXP) || '0', 10)
    if (!token) return null
    if (exp && Date.now() > exp) return null
    return token
  } catch {
    return null
  }
}

export function storeAppTokenData(data = {}) {
  try {
    const token = typeof data?.appToken === 'string'
      ? data.appToken
      : typeof data?.token === 'string'
        ? data.token
        : ''
    if (!token) return null

    localStorage.setItem(KEY_TOKEN, token)

    const expiresAt = data?.appTokenExpiresAt || data?.expiresAt || null
    const expMs = expiresAt ? Date.parse(expiresAt) : 0
    if (expMs) localStorage.setItem(KEY_EXP, String(expMs))

    const uid = data?.uid || data?.sub || data?.userId || null
    if (uid) localStorage.setItem(KEY_UID, String(uid))

    return token
  } catch {
    return null
  }
}

export async function refreshAppToken() {
  // Requires backend /api/auth/refresh to be enabled
  try {
    if (DISABLED) return null
    // Obtain a fresh Firebase ID token to authorize the refresh call
    let idToken = null
    try {
      const user = auth?.currentUser
      if (user) idToken = await user.getIdToken()
    } catch {}
    if (!idToken) {
      // fallback to cached token if any (cold start)
      try { idToken = localStorage.getItem('token') || null } catch {}
    }

    const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {}
    const res = await api.post('/auth/refresh', {}, { headers })
    const data = res?.data || {}
    if (data && data.disabled) {
      DISABLED = true
      return null
    }
    if (data?.token) {
      storeAppTokenData(data)
    }
    return data
  } catch (e) {
    // Fallback: do nothing if unreachable or not enabled
    return null
  }
}

export function clearAppToken() {
  try {
    localStorage.removeItem(KEY_TOKEN)
    localStorage.removeItem(KEY_EXP)
    localStorage.removeItem(KEY_UID)
  } catch {}
}
