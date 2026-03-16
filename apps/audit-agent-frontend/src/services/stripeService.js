// src/services/stripeService.js
import api from '@/services/api'

const DEFAULT_STATUS = Object.freeze({ plan: 'free', status: 'free', remainingDays: 0, cancelAt: null })
const CACHE_KEY = 'subscription_status_cache'
const CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes
const TIMEOUT_BACKOFF_MS = 1000 * 30
const inFlightStatusRequests = new Map()
const timeoutBackoffUntil = new Map()

function loadCacheMap() {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    }
  } catch {}
  return {}
}

function persistCacheMap(map) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(map))
  } catch {}
}

function readCachedStatus(userId) {
  if (!userId) return null
  try {
    const map = loadCacheMap()
    const entry = map[userId]
    if (!entry) return null
    if (!entry.ts || Date.now() - entry.ts > CACHE_TTL_MS) return null
    return entry.data || null
  } catch {
    return null
  }
}

function writeCachedStatus(userId, data) {
  if (!userId || !data) return
  try {
    const map = loadCacheMap()
    map[userId] = { ts: Date.now(), data }
    persistCacheMap(map)
  } catch {}
}

function normalizeStatus(payload) {
  if (!payload || typeof payload !== 'object') return { ...DEFAULT_STATUS }
  const plan = payload.plan || (payload.status === 'active' ? 'premium' : 'free')
  return {
    plan,
    status: payload.status || (plan === 'premium' ? 'active' : 'free'),
    remainingDays: Number(payload.remainingDays || 0),
    cancelAt: payload.cancelAt || null,
  }
}

export async function createCheckoutSession(plan, userId) {
  try {
    const successUrl = window.location.origin + '/subscription?status=success'
    const cancelUrl = window.location.origin + '/subscription?status=cancel'
    const res = await api.post('/create-checkout-session', {
      plan,
      userId,
      uid: userId,
      successUrl,
      cancelUrl,
    })
    const url = res?.data?.url
    if (!url) throw new Error('No checkout URL returned')
    return url
  } catch (err) {
    const serverMsg = err?.response?.data?.error
    console.error('Stripe error:', serverMsg || err?.message)
    throw new Error(serverMsg || 'Payment service temporarily unavailable')
  }
}

export async function getSubscriptionStatus(userId, options = {}) {
  if (!userId) return { ...DEFAULT_STATUS }
  const force = options?.force === true

  // Best effort: skip remote lookup if offline and cached data exists
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const cachedOffline = readCachedStatus(userId)
    if (cachedOffline) return normalizeStatus(cachedOffline)
    return { ...DEFAULT_STATUS }
  }

  if (!force && inFlightStatusRequests.has(userId)) {
    return inFlightStatusRequests.get(userId)
  }

  const backoffUntil = timeoutBackoffUntil.get(userId) || 0
  if (!force && backoffUntil > Date.now()) {
    const cachedDuringBackoff = readCachedStatus(userId)
    return cachedDuringBackoff ? normalizeStatus(cachedDuringBackoff) : { ...DEFAULT_STATUS }
  }

  const request = (async () => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeoutMs = 12000
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const res = await api.get('/subscription/status', {
        params: { userId },
        signal: controller?.signal,
        timeout: timeoutMs,
      })
      const normalized = normalizeStatus(res?.data)
      writeCachedStatus(userId, normalized)
      timeoutBackoffUntil.delete(userId)
      return normalized
    } catch (err) {
      const cached = readCachedStatus(userId)
      if (cached) {
        console.info('Subscription status fallback to cache:', err?.message || err)
        if (err?.code === 'ERR_CANCELED') {
          timeoutBackoffUntil.set(userId, Date.now() + TIMEOUT_BACKOFF_MS)
        }
        return normalizeStatus(cached)
      }
      const message = err?.response?.data || err?.message || err
      if (err?.code === 'ERR_CANCELED') {
        timeoutBackoffUntil.set(userId, Date.now() + TIMEOUT_BACKOFF_MS)
        console.warn('Subscription status request timed out, using defaults')
      } else {
        console.error('Subscription status error:', message)
      }
      return { ...DEFAULT_STATUS }
    } finally {
      if (timer) clearTimeout(timer)
      inFlightStatusRequests.delete(userId)
    }
  })()

  inFlightStatusRequests.set(userId, request)
  return request
}

export async function cancelSubscription(userId) {
  try {
    const res = await api.post('/subscription/cancel', { userId })
    return res?.data || { status: 'canceled' }
  } catch (err) {
    console.error('Cancel subscription error:', err?.response?.data || err?.message)
    throw err
  }
}

export async function reactivateSubscription(userId) {
  try {
    const successUrl = window.location.origin + '/subscription?reactivated=1'
    const cancelUrl = window.location.origin + '/subscription?reactivate=cancel'
    const res = await api.post('/subscription/reactivate', { uid: userId, successUrl, cancelUrl })
    const url = res?.data?.url
    if (!url) throw new Error('No checkout URL returned')
    return url
  } catch (err) {
    const serverMsg = err?.response?.data?.error
    console.error('Stripe reactivate error:', serverMsg || err?.message)
    throw new Error(serverMsg || 'Payment service temporarily unavailable')
  }
}
