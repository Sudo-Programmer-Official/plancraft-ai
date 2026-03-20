import api from '@/services/api'
import { Capacitor } from '@capacitor/core'

const DEFAULT_REDIRECT = '/dashboard'
export const NATIVE_AUTH_CALLBACK_PATH = '/app-auth/complete'
export const ANDROID_APP_PACKAGE = 'com.sudoprogrammer.plancraftai'

function isEnabledFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function buildApiUrl(pathname = '/') {
  const path = String(pathname || '/')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = String(api?.defaults?.baseURL || '/api').trim() || '/api'
  try {
    return new URL(
      `${base.replace(/\/+$/, '')}${normalizedPath}`,
      window.location.origin,
    ).toString()
  } catch {
    return `${base.replace(/\/+$/, '')}${normalizedPath}`
  }
}

export function normalizeRedirectPath(target, fallback = DEFAULT_REDIRECT) {
  if (typeof target !== 'string') return fallback
  const trimmed = target.trim()
  if (!trimmed) return fallback
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback
  if (trimmed.startsWith('//')) return fallback
  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`
}

export function isNativeAndroidApp() {
  try {
    return !!Capacitor?.isNativePlatform?.() && Capacitor?.getPlatform?.() === 'android'
  } catch {
    return false
  }
}

export function isServerDrivenNativeAppleAuthEnabled() {
  const raw = String(import.meta.env.VITE_USE_SERVER_APPLE_AUTH_MOBILE ?? '').trim()
  if (raw) {
    return isEnabledFlag(raw)
  }
  try {
    return !!Capacitor?.isNativePlatform?.() && Capacitor?.getPlatform?.() === 'ios'
  } catch {
    return false
  }
}

export function buildNativeAuthCallbackUrl({ code, redirect } = {}) {
  const origin =
    (typeof window !== 'undefined' && window.location?.origin) ||
    'https://plancraftai.com'
  const params = new URLSearchParams()
  if (code) params.set('code', code)
  params.set('redirect', normalizeRedirectPath(redirect))
  return `${origin}${NATIVE_AUTH_CALLBACK_PATH}?${params.toString()}`
}

export function buildNativeAuthFallbackSchemeUrl({ code, redirect } = {}) {
  const params = new URLSearchParams()
  if (code) params.set('code', code)
  params.set('redirect', normalizeRedirectPath(redirect))
  return `plancraftai://localhost${NATIVE_AUTH_CALLBACK_PATH}?${params.toString()}`
}

export function buildNativeAuthAndroidIntentUrl({ code, redirect } = {}) {
  const params = new URLSearchParams()
  if (code) params.set('code', code)
  params.set('redirect', normalizeRedirectPath(redirect))
  return `intent://localhost${NATIVE_AUTH_CALLBACK_PATH}?${params.toString()}#Intent;scheme=plancraftai;package=${ANDROID_APP_PACKAGE};end`
}

export function buildServerDrivenAppleStartUrl({ redirect, platform = 'ios' } = {}) {
  const url = new URL(buildApiUrl('/auth/apple/start'))
  url.searchParams.set('platform', String(platform || 'ios'))
  url.searchParams.set('redirect', normalizeRedirectPath(redirect))
  return url.toString()
}

export async function closeNativeAuthBrowser() {
  if (!Capacitor?.isNativePlatform?.()) return false
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.close()
    return true
  } catch {
    return false
  }
}

export async function launchNativeAuthRoute(targetUrl) {
  const url = String(targetUrl || '').trim()
  if (!url) throw new Error('Missing native auth launch URL')

  if (Capacitor?.isNativePlatform?.()) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url })
      return {
        url,
        launchMethod: 'capacitor-browser',
      }
    } catch {}
  }

  let launchedWithWindowOpen = false
  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    launchedWithWindowOpen = !!opened
  } catch {}

  if (!launchedWithWindowOpen) {
    window.location.assign(url)
  }

  return {
    url,
    launchMethod: launchedWithWindowOpen ? 'window.open' : 'location.assign',
  }
}

export function parseNativeAuthCallbackUrl(rawUrl = '') {
  try {
    const parsed = new URL(rawUrl)
    if ((parsed.pathname || '/') !== NATIVE_AUTH_CALLBACK_PATH) return null
    const code = parsed.searchParams.get('code')
    if (!code) return null
    return {
      code,
      redirect: normalizeRedirectPath(parsed.searchParams.get('redirect')),
    }
  } catch {
    return null
  }
}

export async function createMobileAuthHandoff(payload = {}) {
  const res = await api.post('/auth/mobile-handoff/create', {
    redirect: normalizeRedirectPath(payload.redirect),
    platform: payload.platform || 'android',
    provider: payload.provider || 'google',
  })
  return res?.data || {}
}

export async function consumeMobileAuthHandoff(code) {
  const res = await api.post('/auth/mobile-handoff/consume', { code })
  return res?.data || {}
}
