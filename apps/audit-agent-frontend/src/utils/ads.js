// src/utils/ads.js
export function trackLinkedInConversion(conversionId) {
  try {
    const pid = import.meta.env.VITE_LINKEDIN_PARTNER_ID
    if (!pid || !conversionId) return
    // window.lintrk is defined by the Insight Tag when partner id is set
    if (typeof window !== 'undefined' && typeof window.lintrk === 'function') {
      window.lintrk('track', { conversion_id: conversionId })
    }
  } catch (_) {
    // swallow errors to never block navigation
  }
}

