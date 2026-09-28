// Embedded webviews inside social apps. Google OAuth rejects these
// (disallowed_useragent) and popups are usually blocked.
const IN_APP_UA =
  /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Twitter|Barcelona|BytedanceWebview|musical_ly|TikTok|Snapchat|Pinterest|Line\/|MicroMessenger/i

export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  return IN_APP_UA.test(navigator.userAgent || '')
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent || '')
}

// Android intent URL that hands the current page to Chrome.
export function buildChromeIntentUrl(href) {
  const url = new URL(href)
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.href)};end`
}
