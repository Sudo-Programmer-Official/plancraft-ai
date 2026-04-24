// src/services/analytics.js
import mixpanel from 'mixpanel-browser'
import { auth } from '@/firebase/init'

let initialized = false
const ONCE_PREFIX = 'analytics_once'
const SIGNUP_PENDING_PREFIX = 'analytics_signup_pending'
const SESSION_ID_KEY = 'analytics_session_id'

function getToken() {
  // console.log('TOKEN?', import.meta.env.VITE_MIXPANEL_TOKEN)
  return import.meta?.env?.VITE_MIXPANEL_TOKEN || ''
}

export function initAnalytics(options = {}) {
  if (typeof window === 'undefined') return
  if (initialized) return

  const token = getToken()
  if (!token) {
    console.warn(
      '[analytics] No VITE_MIXPANEL_TOKEN set. Events will not be sent to Mixpanel.'
    )
  }

  mixpanel.init(token, {
    debug: !!import.meta?.env?.DEV,
    track_pageview: false,
    persistence: 'localStorage',
    ...options,
  })
  initialized = true
}

export function identifyUser(user) {
  safeInit()
  try {
    if (user && user.uid) {
      mixpanel.identify(user.uid)
      const traits = {
        $name: user.displayName || 'User',
        isGuest: resolveGuestState(user),
      }
      if (user.email) traits.$email = user.email
      if (user.mode) traits.authMode = user.mode
      mixpanel.people?.set?.(traits)
    } else {
      let anonId =
        localStorage.getItem('anonId') || `guest_${Date.now()}`
      localStorage.setItem('anonId', anonId)
      mixpanel.identify(anonId)
      mixpanel.people?.set?.({ $name: 'Guest', isGuest: true })
    }
  } catch (e) {
    console.warn('[analytics] identifyUser error:', e)
  }
}

export function trackEvent(name, props = {}) {
  safeInit()
  try {
    mixpanel.track(name, props)
  } catch (e) {
    console.warn('[analytics] trackEvent error:', e)
  }
}

function guestPayload(props = {}) {
  return {
    flow: 'guest_onboarding',
    ...props,
  }
}

export function trackGuestStartFromLanding(props = {}) {
  trackEvent('guest_start_from_landing', guestPayload(props))
}

export function trackGuestReachedSignup(props = {}) {
  trackEvent('guest_reached_signup', guestPayload(props))
}

export function trackGuestCompletedOnboarding(props = {}) {
  trackEvent('guest_completed_onboarding', guestPayload(props))
}

export function trackGuestDashboardLoaded(props = {}) {
  trackEvent('guest_dashboard_loaded', guestPayload(props))
}

export function trackPageView(path) {
  trackEvent('Page View', { path: path || safePath() })
}

/** Fire once per session after identify; use in bootstrap after auth init. Pass platform 'native' | 'web' from app. */
export function trackAppOpened(platform = 'web') {
  const payload = {
    platform,
    version: import.meta.env?.VITE_APP_VERSION || '1.0',
  }
  trackEvent('App Opened', payload)
  trackFirstReturnSession(payload)
}

/** Call when user completes signup (redirect, email, native handoff, guest). */
export function trackSignupCompleted(props = {}) {
  const payload = { platform: 'web', ...props }
  trackEvent('Signup Completed', payload)
  if (props?.registration === true) {
    rememberSignupPendingReturn(payload)
  }
}

/** Call when user closes app or leaves tab; session_length in seconds. */
let sessionStartMs = null
export function getSessionStartMs() {
  if (sessionStartMs == null) sessionStartMs = Date.now()
  return sessionStartMs
}
export function trackSessionEnded() {
  const start = getSessionStartMs()
  const session_length = Math.round((Date.now() - start) / 1000)
  trackEvent('Session Ended', { session_length })
}

/** Call when user accepts an AI suggestion (e.g. daily plan, planner action). */
export function trackAISuggestionAccepted(props = {}) {
  trackEvent('AI Suggestion Accepted', props)
}

export function trackFirstTaskCreated(props = {}) {
  return trackEventOnce('first_task_created', props, { key: 'first_task_created' })
}

export function trackFirstVoiceTaskCreated(props = {}) {
  return trackEventOnce('first_voice_task_created', props, { key: 'first_voice_task_created' })
}

export function trackFirstVoiceCapture(props = {}) {
  return trackEventOnce('first_voice_capture', props, { key: 'first_voice_capture' })
}

export function trackFirstReminderChannelSaved(props = {}) {
  return trackEventOnce('first_reminder_channel_saved', props, {
    key: 'first_reminder_channel_saved',
  })
}

export function trackCalendarConnectStarted(props = {}) {
  trackEvent('calendar_connect_started', props)
}

export function trackCalendarConnected(props = {}) {
  const provider = String(props?.provider || 'calendar').toLowerCase()
  return trackEventOnce('calendar_connected', props, {
    key: `calendar_connected:${provider}`,
  })
}

export function trackFirstReturnSession(props = {}) {
  const storage = safeLocalStorage()
  if (!storage) return false
  const identity = resolveIdentityKey(props?.user)
  if (!identity) return false

  const pendingKey = `${SIGNUP_PENDING_PREFIX}:${identity}`
  const pending = readJson(storage, pendingKey)
  if (!pending) return false

  const sessionId = getSessionId()
  if (pending.sessionId && pending.sessionId === sessionId) return false

  const elapsedHours = Number.isFinite(pending.at)
    ? Math.max(0, Math.round(((Date.now() - pending.at) / (60 * 60 * 1000)) * 10) / 10)
    : null

  trackEvent('first_return_session', {
    platform: props?.platform || 'web',
    method: pending.method || null,
    hours_since_signup: elapsedHours,
  })

  try {
    storage.removeItem(pendingKey)
  } catch {
    /* noop */
  }
  return true
}

export function bindRouter(router) {
  if (!router) return
  safeInit()
  try {
    trackPageView(safePath())
    router.beforeEach((to, _from, next) => {
      trackPageView(to.fullPath || to.path)
      next()
    })
  } catch (e) {
    console.warn('[analytics] bindRouter error:', e)
  }
}

function safeInit() {
  if (!initialized) initAnalytics()
}

function safePath() {
  try {
    return window?.location?.pathname || '/'
  } catch {
    return '/'
  }
}

function resolveGuestState(user) {
  if (user?.isAnonymous === true || user?.isGuest === true || user?.mode === 'guest') return true
  try {
    if (auth?.currentUser?.uid && user?.uid && auth.currentUser.uid === user.uid) {
      return auth.currentUser.isAnonymous === true
    }
  } catch {
    /* noop */
  }
  return false
}

function safeLocalStorage() {
  try {
    return window?.localStorage || null
  } catch {
    return null
  }
}

function safeSessionStorage() {
  try {
    return window?.sessionStorage || null
  } catch {
    return null
  }
}

function readStoredUser() {
  const storage = safeLocalStorage()
  if (!storage) return null
  try {
    return JSON.parse(storage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function resolveDistinctId() {
  safeInit()
  try {
    return mixpanel.get_distinct_id?.() || null
  } catch {
    return null
  }
}

function resolveIdentityKey(user = null) {
  if (user?.uid) return `uid:${user.uid}`
  try {
    if (auth?.currentUser?.uid) return `uid:${auth.currentUser.uid}`
  } catch {
    /* noop */
  }

  const storedUser = readStoredUser()
  if (storedUser?.uid) return `uid:${storedUser.uid}`

  const distinctId = resolveDistinctId()
  if (distinctId) return `did:${distinctId}`

  const storage = safeLocalStorage()
  const anonId = storage?.getItem?.('anonId') || null
  return anonId ? `did:${anonId}` : null
}

function readJson(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* noop */
  }
}

function getSessionId() {
  const storage = safeSessionStorage()
  if (!storage) return 'session_unavailable'

  try {
    const existing = storage.getItem(SESSION_ID_KEY)
    if (existing) return existing

    const next = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    storage.setItem(SESSION_ID_KEY, next)
    return next
  } catch {
    return 'session_unavailable'
  }
}

function trackEventOnce(name, props = {}, options = {}) {
  const storage = safeLocalStorage()
  const identity = options?.identity || resolveIdentityKey(options?.user)
  const key = String(options?.key || name)
  const onceKey = `${ONCE_PREFIX}:${identity || 'anonymous'}:${key}`

  try {
    if (storage?.getItem(onceKey)) return false
  } catch {
    /* noop */
  }

  trackEvent(name, props)

  try {
    storage?.setItem(onceKey, String(Date.now()))
  } catch {
    /* noop */
  }
  return true
}

function rememberSignupPendingReturn(props = {}) {
  const storage = safeLocalStorage()
  if (!storage) return

  const identity = resolveIdentityKey(props?.user)
  if (!identity) return

  writeJson(storage, `${SIGNUP_PENDING_PREFIX}:${identity}`, {
    at: Date.now(),
    method: props?.method || null,
    sessionId: getSessionId(),
  })
}

// ✅ Declare in one shot (fix build error)
export const Analytics = {
  init: initAnalytics,
  identify: identifyUser,
  track: trackEvent,
  page: trackPageView,
  trackAppOpened,
  trackSignupCompleted,
  trackSessionEnded,
  trackAISuggestionAccepted,
  trackFirstTaskCreated,
  trackFirstVoiceTaskCreated,
  trackFirstVoiceCapture,
  trackFirstReminderChannelSaved,
  trackCalendarConnectStarted,
  trackCalendarConnected,
  trackFirstReturnSession,
  bindRouter,
  guest: {
    startFromLanding: trackGuestStartFromLanding,
    reachedSignup: trackGuestReachedSignup,
    completedOnboarding: trackGuestCompletedOnboarding,
    dashboardLoaded: trackGuestDashboardLoaded,
  },
}

export default Analytics
