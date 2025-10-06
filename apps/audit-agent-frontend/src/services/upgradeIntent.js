// src/services/upgradeIntent.js
// Store the user's intent to upgrade and nudge login
// export function redirectToUpgradeIntent(feature) {
//   try {
//     const suffix = feature ? `&feature=${encodeURIComponent(feature)}` : ''
//     localStorage.setItem('postLoginRedirect', `/subscription?upgrade=1${suffix}`)
//   } catch {}
//   try {
//     if (typeof window !== 'undefined') {
//       window.dispatchEvent(new CustomEvent('login-required', { detail: { feature } }))
//     }
//   } catch {}
// }
// export function redirectToUpgradeIntent(feature) {
//   try {
//     const suffix = feature ? `&feature=${encodeURIComponent(feature)}` : ''
//     localStorage.setItem('postLoginRedirect', `/subscription?upgrade=1${suffix}`)
//   } catch {}
//   try {
//     if (typeof window !== 'undefined') {
//       console.log('[redirectToUpgradeIntent] Dispatching login-required for', feature)
//       window.dispatchEvent(new CustomEvent('login-required', { detail: { feature } }))
//     }
//   } catch (e) {
//     console.error('[redirectToUpgradeIntent] Failed dispatch', e)
//   }
// }
export function redirectToUpgradeIntent(feature) {
  try {
    const suffix = feature ? `&feature=${encodeURIComponent(feature)}` : ''
    localStorage.setItem('postLoginRedirect', `/subscription?upgrade=1${suffix}`)
    localStorage.setItem('showLoginPromptOnce', '1') // fallback
    window.dispatchEvent(new CustomEvent('login-required', { detail: { feature } }))
    console.log('[redirectToUpgradeIntent] Dispatched login-required for', feature)
  } catch (err) {
    console.error('redirectToUpgradeIntent failed', err)
  }
}