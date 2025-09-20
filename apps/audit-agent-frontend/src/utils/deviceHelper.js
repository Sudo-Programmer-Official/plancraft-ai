export function isMobileBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || ''
  // Cover modern iOS/iPadOS and Android UAs
  const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /android/i.test(ua)
  const hasMobileToken = /Mobile/.test(ua)
  return isiOS || isAndroid || hasMobileToken
}
export function isSafari() {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS
  const isRealSafari = /^((?!chrome|android).)*safari/i.test(ua)
  return isIOS || isRealSafari
}
