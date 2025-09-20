// // src/utils/mixpanel.js
// import mixpanel from 'mixpanel-browser'

// const PROJECT_TOKEN = import.meta.env.PROJECT_TOKEN

// export function initMixpanel() {
//   mixpanel.init(PROJECT_TOKEN, {
//     debug: true,
//     track_pageview: true,
//   })
// }

// export function trackEvent(name, props = {}) {
//   mixpanel.track(name, props)
// }

// export function identifyUser(userId, traits = {}) {
//   mixpanel.identify(userId)
//   mixpanel.people.set(traits)
// }
// src/services/mixpanel.js
import mixpanel from "mixpanel-browser";

mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN, {
  debug: true,
});

export function trackEvent(name, props = {}) {
  if (!mixpanel || !mixpanel.track) {
    console.warn("Mixpanel not initialized");
    return;
  }
  mixpanel.track(name, props);
}

export default mixpanel;