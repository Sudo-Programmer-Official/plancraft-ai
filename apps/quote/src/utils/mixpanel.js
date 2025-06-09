// src/utils/mixpanel.js
import mixpanel from 'mixpanel-browser'
import dotenv from 'dotenv'
dotenv.config()

const PROJECT_TOKEN = import.meta.env.PROJECT_TOKEN

export function initMixpanel() {
  mixpanel.init(PROJECT_TOKEN, {
    debug: true,
    track_pageview: true,
  })
}

export function trackEvent(name, props = {}) {
  mixpanel.track(name, props)
}

export function identifyUser(userId, traits = {}) {
  mixpanel.identify(userId)
  mixpanel.people.set(traits)
}
