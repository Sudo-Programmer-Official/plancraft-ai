// src/services/api.js
import axios from 'axios'
import { auth } from '@/firebase/init'
import { getAppToken } from '@/services/appTokenService'

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

// Attach fresh auth token if present
api.interceptors.request.use(async (config) => {
  try {
    const user = auth?.currentUser
    if (user) {
      const token = await user.getIdToken() // Firebase auto-refreshes as needed
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
      const token = localStorage.getItem('token')
      if (token) config.headers.Authorization = `Bearer ${token}`
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const u = JSON.parse(userStr)
        if (u?.email) config.headers['x-user-email'] = u.email
        if (u?.uid) config.headers['x-user-id'] = u.uid
        if (u?.role) config.headers['x-user-role'] = u.role
      }
    }
    // Optional: include long-lived app token for backend feature-flagged verification
    try {
      const appTok = getAppToken()
      if (appTok) config.headers['x-app-token'] = appTok
    } catch {}
    // 🕒 Include user timezone (handles mobile/PWA drift)
    try {
      let tz = localStorage.getItem('user_timezone')
      if (!tz || tz === 'UTC') {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        localStorage.setItem('user_timezone', tz)
      }
      config.headers['x-user-tz'] = tz
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
