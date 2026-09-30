// src/services/analytics.js
import mixpanel from 'mixpanel-browser'
import { Capacitor } from '@capacitor/core'
import { auth } from '@/firebase/init'

// Canonical product-funnel events (snake_case). Some older Title Case events
// ('App Opened', 'Task Created', 'Task Completed', 'Signup Completed',
// subscription_funnel_*) still fire alongside these so existing reports keep
// working; build new funnels on these names.
//
// Server-side (backend-node/services/analyticsService.js): reminder_created,
// reminder_delivered, subscription_started.
export const EVENTS = Object.freeze({
  APP_OPEN: 'app_open',
  LANDING_VIEW: 'landing_view',
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TASK_OPENED: 'task_opened',
  TASK_OVERFLOW_OPENED: 'task_overflow_opened',
  AI_HELP_SELECTED: 'ai_help_selected',
  AI_HELP_COMPLETED: 'ai_help_completed',
  AI_STEPS_APPLIED: 'ai_steps_applied',
  VOICE_STARTED: 'voice_started',
  VOICE_TASK_CREATED: 'voice_task_created',
  REMINDER_OPENED: 'reminder_opened',
  FOCUS_STARTED: 'focus_started',
  FOCUS_COMPLETED: 'focus_completed',
  PAYWALL_VIEWED: 'paywall_viewed',
  UPGRADE_CLICKED: 'upgrade_clicked',
  CHECKOUT_STARTED: 'checkout_started',
  FIRST_CAPTURE_STARTED: 'first_capture_started',
  SAVE_PLAN_PROMPT_SHOWN: 'save_plan_prompt_shown',
  SAVE_PLAN_PROMPT_ACTION: 'save_plan_prompt_action',
  SIGN_IN_COMPLETED: 'sign_in_completed',
})

// Never send user content or contact details to analytics. Callers should only
// pass ids, enums, counts and flags; this is the safety net.
const BLOCKED_PROP_KEYS = new Set([
  'title', 'text', 'task', 'tasktitle', 'details', 'notes', 'description', 'content',
  'message', 'body', 'transcript', 'query', 'prompt', 'email', 'phone', 'phonenumber',
  'name', 'displayname', 'address', 'location', 'idea', 'label',
])
const MAX_PROP_STRING_LENGTH = 100
const SIGNUP_WINDOW_MS = 15 * 60 * 1000
const GUEST_UID_PREFIX = 'analytics_guest_uid'

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
  registerBaseContext()
  capturePendingNotificationOpen()
}

// Web push: the service worker opens the app with ?pc_notif=... (see
// public/sw-push.js). Read and strip it at startup, then track it once the
// user is identified via bindNotificationOpenTracking().
let pendingNotificationOpen = null
function capturePendingNotificationOpen() {
  try {
    const url = new URL(window.location.href)
    const type = url.searchParams.get('pc_notif')
    if (!type) return
    pendingNotificationOpen = {
      type,
      reminderType: url.searchParams.get('pc_rtype') || null,
      taskId: url.searchParams.get('pc_task') ? '1' : null,
    }
    ;['pc_notif', 'pc_rtype', 'pc_task'].forEach((key) => url.searchParams.delete(key))
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {
    /* noop */
  }
}

let notificationTrackingBound = false
export function bindNotificationOpenTracking() {
  if (notificationTrackingBound || typeof window === 'undefined') return
  notificationTrackingBound = true
  if (pendingNotificationOpen) {
    trackNotificationOpened(pendingNotificationOpen, 'web_push')
    pendingNotificationOpen = null
  }
  try {
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event?.data?.type === 'pc-notification-opened') {
        trackNotificationOpened(event.data.data || {}, 'web_push')
      }
    })
  } catch {
    /* noop */
  }
}

export function getAnalyticsPlatform() {
  try {
    const platform = Capacitor?.getPlatform?.()
    if (platform === 'ios' || platform === 'android') return platform
  } catch {
    /* noop */
  }
  return 'web'
}

function registerBaseContext() {
  try {
    const platform = getAnalyticsPlatform()
    mixpanel.register({
      platform,
      is_native: platform !== 'web',
      app_version: import.meta.env?.VITE_APP_VERSION || '1.0',
    })
  } catch (e) {
    console.warn('[analytics] register context error:', e)
  }
}

/** Super properties attached to every later event, e.g. { plan: 'premium' }. */
export function setAnalyticsContext(props = {}) {
  if (typeof window === 'undefined') return
  safeInit()
  try {
    mixpanel.register(sanitizeProps(props))
  } catch (e) {
    console.warn('[analytics] setAnalyticsContext error:', e)
  }
}

export function sanitizeProps(props = {}) {
  const out = {}
  for (const [key, value] of Object.entries(props || {})) {
    if (BLOCKED_PROP_KEYS.has(key.toLowerCase().replace(/[_\-\s]/g, ''))) continue
    if (value === undefined || typeof value === 'function') continue
    if (typeof value === 'string' && value.length > MAX_PROP_STRING_LENGTH) continue
    if (value && typeof value === 'object' && !Array.isArray(value)) continue
    out[key] = value
  }
  return out
}

export function identifyUser(user) {
  safeInit()
  try {
    if (user && user.uid) {
      mixpanel.identify(user.uid)
      const isGuest = resolveGuestState(user)
      // No name/email/phone on analytics profiles; the uid is enough to join.
      const traits = { isGuest }
      if (user.mode) traits.authMode = user.mode
      mixpanel.people?.set?.(traits)
      detectSignupCompleted(user, isGuest)
    } else {
      let anonId =
        localStorage.getItem('anonId') || `guest_${Date.now()}`
      localStorage.setItem('anonId', anonId)
      mixpanel.identify(anonId)
      mixpanel.people?.set?.({ isGuest: true })
    }
  } catch (e) {
    console.warn('[analytics] identifyUser error:', e)
  }
}

export function trackEvent(name, props = {}) {
  safeInit()
  try {
    mixpanel.track(name, sanitizeProps(props))
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
  trackEvent(EVENTS.APP_OPEN)
  trackFirstReturnSession(payload)
}

/**
 * Legacy 'Signup Completed' (fires on sign-in too, see `registration`).
 * The funnel event signup_completed is detected in identifyUser().
 */
export function trackSignupCompleted(props = {}) {
  const payload = { platform: getAnalyticsPlatform(), ...props }
  trackEvent('Signup Completed', payload)
  if (props?.registration === true) {
    rememberSignupPendingReturn(payload)
  }
}

/** User picked a sign-in/sign-up method. intent: 'login' | 'register' | 'unknown'. */
export function trackSignupStarted(method, intent = 'unknown') {
  trackEvent(EVENTS.SIGNUP_STARTED, { method, intent })
}

function resolveAuthMethod(firebaseUser, fallback) {
  const providerId = String(firebaseUser?.providerData?.[0]?.providerId || '').toLowerCase()
  if (providerId.includes('google')) return 'google'
  if (providerId.includes('apple')) return 'apple'
  if (providerId === 'password') return 'email'
  if (providerId === 'phone') return 'phone'
  return fallback || 'unknown'
}

// Fires signup_completed once per account, for every sign-in method and for
// guests converting to a real account. A fixed time + $insert_id lets Mixpanel
// dedupe it when the same signup is seen on two devices (native app handing
// sign-in off to the system browser).
function detectSignupCompleted(user, isGuest) {
  const storage = safeLocalStorage()
  const guestKey = `${GUEST_UID_PREFIX}:${user.uid}`
  if (isGuest) {
    try {
      storage?.setItem(guestKey, '1')
    } catch {
      /* noop */
    }
    return
  }

  const firebaseUser = auth?.currentUser?.uid === user.uid ? auth.currentUser : null
  if (!firebaseUser) return
  const createdMs = Date.parse(firebaseUser.metadata?.creationTime || '')
  const convertedFromGuest = !!storage?.getItem?.(guestKey)
  const isNewAccount = Number.isFinite(createdMs) && Date.now() - createdMs < SIGNUP_WINDOW_MS
  if (!isNewAccount && !convertedFromGuest) return

  const tracked = trackEventOnce(
    EVENTS.SIGNUP_COMPLETED,
    {
      method: resolveAuthMethod(firebaseUser, user.mode),
      converted_from_guest: convertedFromGuest,
      ...(Number.isFinite(createdMs) ? { time: Math.floor(createdMs / 1000) } : {}),
      $insert_id: `su-${user.uid}`.slice(0, 36),
    },
    { key: 'signup_completed', identity: `uid:${user.uid}` },
  )
  if (tracked) {
    try {
      storage?.removeItem(guestKey)
    } catch {
      /* noop */
    }
  }
}

export function trackOnboarding(step, props = {}) {
  const name = {
    started: EVENTS.ONBOARDING_STARTED,
    completed: EVENTS.ONBOARDING_COMPLETED,
    skipped: EVENTS.ONBOARDING_SKIPPED,
  }[step]
  if (name) trackEvent(name, props)
}

/** Buckets a task's `source` into how the user created it. */
export function classifyTaskCreationMethod(source) {
  const s = String(source || '').toLowerCase()
  if (!s || s === 'manual') return 'manual'
  if (/(voice|speech|talk|transcri|napkin)/.test(s)) return 'voice'
  if (/calendar/.test(s)) return 'calendar'
  if (/(vision|upload|paste|import)/.test(s)) return 'import'
  if (/(ai|gpt|plan|generate|suggest|nlp|prompt|inbox|knowledge|template)/.test(s)) return 'ai'
  return 'other'
}

export function trackTaskCreated(props = {}) {
  const method = classifyTaskCreationMethod(props.source)
  trackEvent(EVENTS.TASK_CREATED, { ...props, method })
  if (method === 'voice') trackEvent(EVENTS.VOICE_TASK_CREATED, props)
}

export function trackVoiceStarted(surface) {
  trackEvent(EVENTS.VOICE_STARTED, { surface: surface || 'unknown' })
}

export function trackVoiceAutoStopped(props = {}) {
  trackEvent('voice_auto_stopped', props)
}

export function trackVoiceManualStopped(props = {}) {
  trackEvent('voice_manual_stopped', props)
}

/** A notification was tapped/clicked. `data` is the push payload's data object. */
export function trackNotificationOpened(data = {}, via = 'unknown') {
  const type = String(data?.type || '').toLowerCase().replace(/_/g, '-')
  if (type !== 'reminder-due' && !data?.reminderId) return
  trackEvent(EVENTS.REMINDER_OPENED, {
    via,
    reminder_type: data?.reminderType || null,
    has_task: !!data?.taskId,
  })
}

// Maps the existing subscription_funnel_* steps onto the canonical funnel.
// Purchases are tracked server-side as subscription_started.
const MONETIZATION_STEPS = {
  page_view: EVENTS.PAYWALL_VIEWED,
  cta_click: EVENTS.UPGRADE_CLICKED,
  checkout_redirect: EVENTS.CHECKOUT_STARTED,
}
export function trackMonetizationStep(step, props = {}) {
  const name = MONETIZATION_STEPS[step]
  if (name) trackEvent(name, props)
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

export function trackFirstCaptureStarted(props = {}) {
  return trackEventOnce(EVENTS.FIRST_CAPTURE_STARTED, props, { key: 'first_capture_started' })
}

export function trackSavePlanPromptShown(props = {}) {
  trackEvent(EVENTS.SAVE_PLAN_PROMPT_SHOWN, props)
}

export function trackSavePlanPromptAction(props = {}) {
  trackEvent(EVENTS.SAVE_PLAN_PROMPT_ACTION, props)
}

export function trackSignInCompleted(props = {}) {
  trackEvent(EVENTS.SIGN_IN_COMPLETED, props)
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
      // Path only: query strings can carry emails, tokens or search text.
      trackPageView(to.path)
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
  trackFirstCaptureStarted,
  trackSavePlanPromptShown,
  trackSavePlanPromptAction,
  trackSignInCompleted,
  trackFirstVoiceTaskCreated,
  trackFirstVoiceCapture,
  trackVoiceAutoStopped,
  trackVoiceManualStopped,
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
