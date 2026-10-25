// src/services/api.js
import axios from 'axios'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase/init'
import { getAppToken } from '@/services/appTokenService'
import { clearStoredAuthArtifacts, readNativeIosAuthSnapshot } from '@/utils/authStorage'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

// Base API points to Vite proxy '/api' in dev
// Prefer VITE_API_BASE_ROOT; if missing but VITE_API_BASE_URL is set (e.g. to /api/ai),
// derive the generic API root by stripping path to '/api'.
function deriveApiRoot() {
  const root = import.meta.env.VITE_API_BASE_ROOT
  if (root && typeof root === 'string') return root
  const alt = import.meta.env.VITE_API_BASE_URL
  if (alt && typeof alt === 'string') {
    try {
      const u = new URL(alt)
      return `${u.origin}/api`
    } catch {
      // If relative, fall back
    }
  }
  return '/api'
}
const BASE = deriveApiRoot().replace(/\/+$/, '')

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

function withTimeout(promise, ms = 5000) {
  return new Promise((resolve, reject) => {
    let done = false
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        reject(new Error('Request timed out'))
      }
    }, ms)
    Promise.resolve(promise)
      .then((value) => {
        if (done) return
        done = true
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        if (done) return
        done = true
        clearTimeout(timer)
        reject(error)
      })
  })
}

let firebaseTokenRefreshPromise = null
let sessionExpiryRedirectStarted = false

function tokenExpiryMs(token) {
  try {
    const payload = String(token || '').split('.')[1]
    if (!payload) return 0
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const claims = JSON.parse(atob(padded))
    const exp = Number(claims?.exp || 0)
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : 0
  } catch {
    return 0
  }
}

function isUsableBearerToken(token, skewMs = 30 * 1000) {
  const value = String(token || '').trim()
  if (!value || value.split('.').length < 3) return false
  const expiresAt = tokenExpiryMs(value)
  return expiresAt > Date.now() + skewMs
}

function persistFirebaseToken(token) {
  if (!isUsableBearerToken(token)) return null
  try { localStorage.setItem('token', token) } catch { /* storage is optional */ }
  return token
}

function isTerminalAuthError(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()
  return [
    'auth/id-token-expired',
    'auth/user-token-expired',
    'auth/invalid-user-token',
    'auth/invalid-refresh-token',
    'auth/user-disabled',
    'auth/user-not-found',
  ].includes(code) || /(?:token|session).*(?:expired|revoked|invalid)/i.test(message)
}

function isAuthRefreshRequest(config) {
  return /(?:^|\/)auth\/refresh(?:$|\?)/i.test(String(config?.url || ''))
}

function redirectToLoginForExpiredSession() {
  if (typeof window === 'undefined' || sessionExpiryRedirectStarted) return
  if (window.location.pathname === '/login') return
  sessionExpiryRedirectStarted = true

  const currentPath = `${window.location.pathname || '/'}${window.location.search || ''}${window.location.hash || ''}`
  try { clearStoredAuthArtifacts() } catch { /* auth cleanup is best effort */ }
  Promise.resolve(signOut(auth)).catch(() => {}).finally(() => {
    const query = new URLSearchParams({
      expired: '1',
      redirect: currentPath || '/today',
    })
    window.location.replace(`/login?${query.toString()}`)
  })
}

async function forceRefreshFirebaseToken(user = auth?.currentUser) {
  if (!user?.getIdToken) return null
  if (!firebaseTokenRefreshPromise) {
    firebaseTokenRefreshPromise = withTimeout(user.getIdToken(true), 8000)
      .then((token) => {
        const freshToken = persistFirebaseToken(token)
        if (!freshToken) throw new Error('Firebase returned an unusable ID token')
        return freshToken
      })
      .finally(() => {
        firebaseTokenRefreshPromise = null
      })
  }
  return firebaseTokenRefreshPromise
}

async function getFirebaseBearerToken(user = auth?.currentUser) {
  if (!user?.getIdToken) return null
  try {
    const token = await withTimeout(user.getIdToken(), 4500)
    if (isUsableBearerToken(token)) return persistFirebaseToken(token)
  } catch {
    // Force-refresh below. Never fall back to a stale token while Firebase has
    // a current user, because that causes repeated auth/id-token-expired 401s.
  }
  try {
    return await forceRefreshFirebaseToken(user)
  } catch (error) {
    try { localStorage.removeItem('token') } catch { /* storage is optional */ }
    if (isTerminalAuthError(error)) redirectToLoginForExpiredSession()
    return null
  }
}

// Attach fresh auth token if present
api.interceptors.request.use(async (config) => {
  try {
    const nativeSnapshot = readNativeIosAuthSnapshot()
    const user = auth?.currentUser
    if (user) {
      const token = await getFirebaseBearerToken(user)
      if (token) config.headers.Authorization = `Bearer ${token}`
      // Optional pass-through user context
      if (user.email) config.headers['x-user-email'] = user.email
      if (user.uid) config.headers['x-user-id'] = user.uid
      // Try to include role from cached profile (authStore persists it)
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const u = JSON.parse(userStr)
          if (u?.role) config.headers['x-user-role'] = u.role
        }
      } catch { /* cached profile is optional */ }
    } else {
      // fallback to cached token if any
      let token = null
      try {
        const cachedToken = localStorage.getItem('token')
        token = isUsableBearerToken(cachedToken) ? cachedToken : null
      } catch { /* cached token is optional */ }
      if (!token && isUsableBearerToken(nativeSnapshot?.idToken)) token = nativeSnapshot.idToken
      if (token) config.headers.Authorization = `Bearer ${token}`
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const u = JSON.parse(userStr)
        if (u?.email) config.headers['x-user-email'] = u.email
        if (u?.uid) config.headers['x-user-id'] = u.uid
        if (u?.role) config.headers['x-user-role'] = u.role
      } else if (nativeSnapshot?.localId) {
        config.headers['x-user-id'] = nativeSnapshot.localId
        if (nativeSnapshot?.email) config.headers['x-user-email'] = nativeSnapshot.email
      }
    }
    // Optional: include long-lived app token for backend feature-flagged verification
    try {
      const appTok = getAppToken()
      if (appTok) config.headers['x-app-token'] = appTok
    } catch { /* app token is optional */ }
    // 🕒 Include user timezone (handles mobile/PWA drift)
    try {
      config.headers['x-user-tz'] = getEffectiveUserTimezone()
    } catch {
      config.headers['x-user-tz'] = 'UTC'
    }
    // 🌍 Include user country (best-effort from locale)
    try {
      const lang = (navigator.language || 'en-US').toUpperCase()
      const cc = (lang.split('-')[1] || 'US').toUpperCase()
      config.headers['x-user-country'] = cc
    } catch {
      config.headers['x-user-country'] = 'US'
    }
    // Workspace context
    try {
      const workspaceId = localStorage.getItem('activeWorkspaceId')
      if (workspaceId) config.headers['x-workspace-id'] = workspaceId
    } catch { /* workspace context is optional */ }
  } catch { /* auth headers are best effort */ }
  return config
})

export default api

// Global 403 upgrade banner trigger
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    try {
      const status = error?.response?.status
      const requestConfig = error?.config
      if (status === 401 && requestConfig && !requestConfig.__firebaseAuthRetried && auth?.currentUser) {
        requestConfig.__firebaseAuthRetried = true
        const token = await forceRefreshFirebaseToken(auth.currentUser).catch(() => null)
        if (token) {
          requestConfig.headers = requestConfig.headers || {}
          requestConfig.headers.Authorization = `Bearer ${token}`
          return api.request(requestConfig)
        }
      }
      if (
        status === 401 &&
        requestConfig &&
        !isAuthRefreshRequest(requestConfig) &&
        (requestConfig.__firebaseAuthRetried || requestConfig.headers?.Authorization || requestConfig.headers?.authorization)
      ) {
        redirectToLoginForExpiredSession()
      }
      if (status === 401) {
        console.error('[API] 401 response', {
          url: error?.config?.baseURL
            ? `${String(error.config.baseURL).replace(/\/+$/, '')}/${String(error?.config?.url || '').replace(/^\/+/, '')}`
            : error?.config?.url || null,
          method: error?.config?.method || null,
          hasAuthHeader: !!(error?.config?.headers?.Authorization || error?.config?.headers?.authorization),
          responseData: error?.response?.data || null,
        })
      }

      const msg = (error?.response?.data?.error || '').toString().toLowerCase()
      const isLimit = status === 403 && /limit|upgrade/.test(msg)
      if (isLimit && typeof window !== 'undefined') {
        const detail = {
          source: 'api',
          path: error?.config?.url,
          message: error?.response?.data?.error,
        }
        window.dispatchEvent(new CustomEvent('upgrade-required', { detail }))
      }
    } catch { /* upgrade notification is best effort */ }
    return Promise.reject(error)
  },
)
