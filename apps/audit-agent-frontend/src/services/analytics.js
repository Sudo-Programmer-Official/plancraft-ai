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
      mixpanel.people?.set?.({
        $name: user.displayName || 'User',
        $email: user.email || undefined,
        isGuest: !!user.isAnonymous,
      })
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

export function trackPageView(path) {
  trackEvent('Page View', { path: path || safePath() })
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
  bindRouter,
}

export default Analytics