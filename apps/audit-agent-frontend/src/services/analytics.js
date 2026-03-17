// src/services/analytics.js
import mixpanel from 'mixpanel-browser'

let initialized = false

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
        isGuest: !!user.isAnonymous,
      }
      if (user.email) traits.$email = user.email
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
  trackEvent('App Opened', {
    platform,
    version: import.meta.env?.VITE_APP_VERSION || '1.0',
  })
}

/** Call when user completes signup (redirect, email, native handoff, guest). */
export function trackSignupCompleted(props = {}) {
  trackEvent('Signup Completed', { platform: 'web', ...props })
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
  bindRouter,
  guest: {
    startFromLanding: trackGuestStartFromLanding,
    reachedSignup: trackGuestReachedSignup,
    completedOnboarding: trackGuestCompletedOnboarding,
    dashboardLoaded: trackGuestDashboardLoaded,
  },
}

export default Analytics
