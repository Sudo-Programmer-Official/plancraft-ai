// Biometric app lock (Phase 1). Face ID / fingerprint only unlocks the app
// UI for an already signed-in user; it is not an identity provider and no
// credential or biometric data is stored here. Preferences are plain flags.
import { Capacitor } from '@capacitor/core'
import { NativeBiometric, BiometryType, BiometricAuthError } from '@capgo/capacitor-native-biometric'

const PREFS_KEY = 'app_lock_prefs'
const OFFERED_KEY_PREFIX = 'app_lock_offered:'

export const LOCK_TIMEOUT_OPTIONS = [
  { label: 'Immediately', value: 0 },
  { label: 'After 1 minute', value: 60 * 1000 },
  { label: 'After 5 minutes', value: 5 * 60 * 1000 },
  { label: 'After 15 minutes', value: 15 * 60 * 1000 },
]
export const DEFAULT_LOCK_TIMEOUT_MS = 60 * 1000

export function isAppLockPlatform() {
  try {
    return !!Capacitor?.isNativePlatform?.()
  } catch {
    return false
  }
}

// { uid, enabled, timeoutMs } for the single signed-in account on this device.
export function readAppLockPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null')
    if (!prefs?.uid) return null
    return {
      uid: String(prefs.uid),
      enabled: prefs.enabled === true,
      timeoutMs: Number.isFinite(prefs.timeoutMs) ? prefs.timeoutMs : DEFAULT_LOCK_TIMEOUT_MS,
    }
  } catch {
    return null
  }
}

export function writeAppLockPrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable (private mode) */
  }
}

// Called on logout: the next sign-in starts unlocked and is offered again.
export function clearAppLockPrefs() {
  try {
    localStorage.removeItem(PREFS_KEY)
  } catch {
    /* storage unavailable (private mode) */
  }
}

export function wasAppLockOffered(uid) {
  try {
    return localStorage.getItem(`${OFFERED_KEY_PREFIX}${uid}`) === '1'
  } catch {
    return true
  }
}

export function markAppLockOffered(uid) {
  try {
    localStorage.setItem(`${OFFERED_KEY_PREFIX}${uid}`, '1')
  } catch {
    /* storage unavailable (private mode) */
  }
}

export function biometryLabel(type) {
  switch (type) {
    case BiometryType.FACE_ID:
      return 'Face ID'
    case BiometryType.TOUCH_ID:
      return 'Touch ID'
    case BiometryType.FINGERPRINT:
      return 'Fingerprint'
    case BiometryType.FACE_AUTHENTICATION:
      return 'Face unlock'
    default:
      return 'Biometrics'
  }
}

export async function getBiometricAvailability() {
  if (!isAppLockPlatform()) return { available: false, biometryType: BiometryType.NONE }
  try {
    // A device passcode only counts on iOS, where verifyIdentity can fall back
    // to it. Android's BiometricPrompt here needs an enrolled biometric.
    const result = await NativeBiometric.isAvailable({ useFallback: Capacitor.getPlatform() === 'ios' })
    return { available: !!result?.isAvailable, biometryType: result?.biometryType ?? BiometryType.NONE }
  } catch {
    return { available: false, biometryType: BiometryType.NONE }
  }
}

export async function onBiometryChange(listener) {
  if (!isAppLockPlatform()) return null
  try {
    return await NativeBiometric.addListener('biometryChange', (result) => {
      listener({ available: !!result?.isAvailable, biometryType: result?.biometryType ?? BiometryType.NONE })
    })
  } catch {
    return null
  }
}

// Resolves on success. Rejects with { kind, message } where kind is
// 'cancelled' (stay quiet), 'failed' (retry), or 'unavailable' (fall back to sign-in).
export async function verifyBiometric({ reason = 'Unlock PlanCraftAI', title = 'Unlock PlanCraftAI' } = {}) {
  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title,
      subtitle: 'Confirm it’s you',
      negativeButtonText: 'Cancel',
      useFallback: true,
      maxAttempts: 3,
    })
  } catch (error) {
    const code = Number(error?.code)
    if (
      [
        BiometricAuthError.USER_CANCEL,
        BiometricAuthError.APP_CANCEL,
        BiometricAuthError.SYSTEM_CANCEL,
        // Requested while the app wasn't frontmost yet (e.g. mid-resume).
        BiometricAuthError.NOT_INTERACTIVE,
      ].includes(code)
    ) {
      throw { kind: 'cancelled', message: '' }
    }
    if (
      [
        BiometricAuthError.BIOMETRICS_UNAVAILABLE,
        BiometricAuthError.BIOMETRICS_NOT_ENROLLED,
        BiometricAuthError.PASSCODE_NOT_SET,
        BiometricAuthError.USER_LOCKOUT,
      ].includes(code) ||
      // iOS rejects with no code when LocalAuthentication can't evaluate at all.
      /not available/i.test(String(error?.message || ''))
    ) {
      throw { kind: 'unavailable', message: 'Biometric unlock isn’t available on this phone right now.' }
    }
    throw { kind: 'failed', message: 'We couldn’t confirm it’s you. Try again.' }
  }
}
