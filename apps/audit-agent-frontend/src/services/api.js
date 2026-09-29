// src/services/api.js
import axios from 'axios'
import { auth } from '@/firebase/init'
import { getAppToken } from '@/services/appTokenService'
import { readNativeIosAuthSnapshot } from '@/utils/authStorage'
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

// Attach fresh auth token if present
api.interceptors.request.use(async (config) => {
  try {
    const nativeSnapshot = readNativeIosAuthSnapshot()
    const user = auth?.currentUser
    if (user) {
      let token = null
      try {
        // Avoid hanging requests when Firebase token refresh stalls.
        token = await withTimeout(user.getIdToken(), 4500)
      } catch {
        token = localStorage.getItem('token') || nativeSnapshot?.idToken || null
      }
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
      } catch {}
    } else {
      // fallback to cached token if any
      const token = localStorage.getItem('token') || nativeSnapshot?.idToken || null
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
    } catch {}
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
    } catch {}
  } catch {}
  return config
})

export default api

// Global 403 upgrade banner trigger
api.interceptors.response.use(
  (res) => res,
  (error) => {
    try {
      const status = error?.response?.status
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
    } catch {}
    return Promise.reject(error)
  },
)
