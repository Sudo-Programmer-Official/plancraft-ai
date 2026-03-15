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
  return isNativePackagedApp() && ['android', 'ios'].includes(getNativePlatform())
}

export function supportsNativeGoogleRedirectBridge() {
  return isAndroidPackagedApp()
}

export function getNativeAuthRestriction(method = 'provider') {
  switch (method) {
    case 'google':
      if (supportsNativeGoogleRedirectBridge()) {
        return 'Google sign-in on Android uses the browser return-to-app bridge. If it fails, update the Android app links and deep-link handoff configuration.'
      }
      if (supportsNativeGoogleSignIn()) {
        return 'Google sign-in on iOS currently uses Firebase redirect flow inside the packaged app. If it fails, verify iOS Firebase auth domain, redirect handling, and native app configuration.'
      }
      return 'Google sign-in in the packaged mobile app still depends on Firebase Web popup/redirect flow. Use the browser or PWA build until native Google auth is wired.'
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
