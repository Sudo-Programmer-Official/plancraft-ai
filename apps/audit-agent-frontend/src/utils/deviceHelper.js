export function isMobileBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return /android/i.test(ua) || /iPad|iPhone|iPod/.test(ua)
}

export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}