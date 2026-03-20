import { Capacitor } from '@capacitor/core'

export function isNativePackagedApp() {
  try {
    return !!Capacitor?.isNativePlatform?.()
  } catch {
    return false
  }
}

export function getNativePlatform() {
  try {
    return Capacitor?.getPlatform?.() || 'web'
  } catch {
    return 'web'
  }
}

export function isAndroidPackagedApp() {
  return isNativePackagedApp() && getNativePlatform() === 'android'
}

export function isIosPackagedApp() {
  return isNativePackagedApp() && getNativePlatform() === 'ios'
}

export function supportsNativeGoogleSignIn() {
  return false
}

export function supportsNativeGoogleRedirectBridge() {
  return false
}

export function getNativeAuthRestriction(method = 'provider') {
  switch (method) {
    case 'google':
      return 'Google sign-in is disabled in the packaged Android and iOS app. Use email/password on mobile, or continue with Google on the web build.'
    case 'apple':
      return 'Apple sign-in in the packaged mobile app still depends on Firebase Web popup/redirect flow. Use the browser or PWA build until native Apple auth is wired.'
    case 'phone':
      return 'Phone OTP in the packaged mobile app still depends on RecaptchaVerifier and Firebase Web phone auth. Use the browser or PWA build until native phone auth is wired.'
    case 'magic-link':
      return 'Magic-link sign-in in the packaged mobile app is not reliable yet because native deep-link return handling is not wired.'
    default:
      return 'This packaged mobile build does not yet include native-compatible auth wiring for this sign-in method.'
  }
}
