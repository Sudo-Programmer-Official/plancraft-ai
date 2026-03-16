// Lightweight initializer for LinkedIn Insight Tag
// Reads partner id from Vite env and injects the script at runtime.
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

export function setupLinkedInTag() {
  try {
    if (isNativePackagedApp()) return
    const partnerId = import.meta.env.VITE_LINKEDIN_PARTNER_ID
    if (!partnerId) return

    // Avoid double-injecting
    if (window._linkedin_data_partner_ids?.includes(partnerId)) return

    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []
    window._linkedin_data_partner_ids.push(partnerId)

    ;(function (l) {
      if (!l) {
        window.lintrk = function (a, b) {
          window.lintrk.q.push([a, b])
        }
        window.lintrk.q = []
      }
      const s = document.getElementsByTagName('script')[0]
      const b = document.createElement('script')
      b.type = 'text/javascript'
      b.async = true
      b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js'
      s.parentNode.insertBefore(b, s)
    })(window.lintrk)
  } catch {}
}
