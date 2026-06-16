import axios, { AxiosInstance } from 'axios'
import { ElMessage } from 'element-plus'
import { auth } from '@/firebase/init'
import { getAppToken } from '@/services/appTokenService'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ensureAiConsentOrThrow } from '@/services/aiConsentService'

type Service = 'growth' | 'goals' | 'posting' | 'creator' | 'nlp'

type AuthHeaderOptions = {
  forceRefresh?: boolean
}

const normalize = (url?: string | null) => (url ? url.replace(/\/+$/, '') : '')

function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url)
}

function resolveBase(service: Service): string {
  switch (service) {
    case 'growth': {
      const direct = normalize(import.meta.env.VITE_GROWTH_API_BASE as string)
      if (direct) return direct
      const svc = normalize(import.meta.env.VITE_GROWTH_SERVICE_URL as string)
      if (svc) return `${svc}/api/growth`
      return '/growth-api'
    }
    case 'goals': {
      const direct = normalize(import.meta.env.VITE_GOALS_API_BASE as string)
      if (direct) return direct
      const svc = normalize(import.meta.env.VITE_GOALS_SERVICE_URL as string)
      if (svc) return `${svc}/api/goals`
      return '/goals-api'
    }
    case 'posting': {
      const direct = normalize(import.meta.env.VITE_POSTING_API_BASE as string)
      if (direct) return direct
      const svc = normalize(import.meta.env.VITE_POSTING_SERVICE_URL as string)
      if (svc) return svc
      return '/posting-api'
    }
    case 'creator': {
      const direct = normalize(import.meta.env.VITE_CREATOR_API_BASE as string)
      if (direct) return direct
      const svc = normalize(import.meta.env.VITE_CREATOR_SERVICE_URL as string)
      if (svc) return svc
      return '/creator-api'
    }
    case 'nlp': {
      const direct = normalize(import.meta.env.VITE_NLP_API_BASE as string)
      if (direct) {
        if (typeof window !== 'undefined' && isAbsoluteUrl(direct)) {
          try {
            const directOrigin = new URL(direct).origin
            if (directOrigin !== window.location.origin) {
              return '/api/nlp'
            }
          } catch {
            return '/api/nlp'
          }
        }
        return direct
      }
      return '/api/nlp'
    }
    default:
      return '/'
  }
}

export async function buildAuthHeaders(opts: AuthHeaderOptions = {}) {
  const headers: Record<string, string> = {}
  try {
    const envAppToken =
      (import.meta.env.VITE_CREATOR_APP_TOKEN as string) ||
      (import.meta.env.VITE_GROWTH_SERVICE_APP_TOKEN as string) ||
      (import.meta.env.VITE_SERVICE_APP_TOKEN as string) ||
      (import.meta.env.VITE_APP_TOKEN as string)
    const cachedAppToken = getAppToken()
    const appToken = envAppToken || cachedAppToken
    if (appToken) headers['x-app-token'] = appToken

    const user = auth?.currentUser
    if (user) {
      const token = await user.getIdToken(opts.forceRefresh || false)
      if (token) headers.Authorization = `Bearer ${token}`
      if (user.email) headers['x-user-email'] = user.email
      if (user.uid) headers['x-user-id'] = user.uid
    } else {
      const token = localStorage.getItem('token')
      if (token) headers.Authorization = `Bearer ${token}`
      try {
        const raw = localStorage.getItem('user')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.email) headers['x-user-email'] = parsed.email
          if (parsed?.uid) headers['x-user-id'] = parsed.uid
          if (parsed?.role) headers['x-user-role'] = parsed.role
        }
      } catch {}
    }
    // Do not override env app token; cached app token is only used if env missing (handled above)
    try {
      let tz = localStorage.getItem('user_timezone')
      if (!tz) {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        localStorage.setItem('user_timezone', tz)
      }
      headers['x-user-tz'] = tz || 'UTC'
    } catch {
      headers['x-user-tz'] = 'UTC'
    }
    try {
      const workspaceStore = useWorkspaceStore()
      const workspaceId = workspaceStore?.activeWorkspaceId || localStorage.getItem('activeWorkspaceId')
      if (workspaceId) headers['x-workspace-id'] = workspaceId
    } catch {
      const workspaceId = localStorage.getItem('activeWorkspaceId')
      if (workspaceId) headers['x-workspace-id'] = workspaceId
    }
    try {
      const lang = (navigator.language || 'en-US').toUpperCase()
      const cc = (lang.split('-')[1] || 'US').toUpperCase()
      headers['x-user-country'] = cc
    } catch {
      headers['x-user-country'] = 'US'
    }

    // Fallback: if no bearer token was set but we have an app token, set it as bearer to satisfy services
    if (!headers.Authorization) {
      const bearer = headers['x-app-token'] || envAppToken || localStorage.getItem('token') || null
      if (bearer) headers.Authorization = `Bearer ${bearer}`
    }
  } catch {}
  return headers
}

function defaultErrorHandler(error: any) {
  const msg =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Request failed'
  try {
    ElMessage.error(msg)
  } catch {}
}

function makeClient(baseURL: string, opts: { timeout?: number; silent?: boolean } = {}): AxiosInstance {
  const client = axios.create({
    baseURL: normalize(baseURL),
    timeout: opts.timeout || 30000,
  })

  client.interceptors.request.use(async (config) => {
    if (baseURL === resolveBase('nlp')) {
      await ensureAiConsentOrThrow({ source: 'nlp-request' })
    }
    const headers = await buildAuthHeaders()
    config.headers = { ...(config.headers || {}), ...headers }
    return config
  })

  client.interceptors.response.use(
    (res) => res,
    (error) => {
      if (!opts.silent) defaultErrorHandler(error)
      return Promise.reject(error)
    },
  )

  return client
}

export const growthClient = makeClient(resolveBase('growth'))
export const goalsClient = makeClient(resolveBase('goals'))
export const postingClient = makeClient(resolveBase('posting'))
export const creatorClient = makeClient(resolveBase('creator'))
export const nlpClient = makeClient(resolveBase('nlp'))

export function serviceBases() {
  return {
    growth: resolveBase('growth'),
    goals: resolveBase('goals'),
    posting: resolveBase('posting'),
    creator: resolveBase('creator'),
    nlp: resolveBase('nlp'),
  }
}
