import { defineStore } from 'pinia'
import {
  DEFAULT_LOCK_TIMEOUT_MS,
  biometryLabel,
  clearAppLockPrefs,
  getBiometricAvailability,
  isAppLockPlatform,
  onBiometryChange,
  readAppLockPrefs,
  verifyBiometric,
  writeAppLockPrefs,
} from '@/services/appLockService'

// Short system interruptions (Android permission dialogs, the biometric
// prompt's own activity) pause the app too; don't treat them as leaving it.
const MIN_BACKGROUND_MS_TO_LOCK = 1500
const RESUME_GRACE_MS = 1500

const initialPrefs = typeof window !== 'undefined' ? readAppLockPrefs() : null

export const useAppLockStore = defineStore('appLock', {
  state: () => ({
    prefs: initialPrefs,
    // Lock synchronously on cold start so app content never flashes.
    locked: isAppLockPlatform() && initialPrefs?.enabled === true,
    obscured: false,
    available: false,
    biometryType: 0,
    availabilityChecked: false,
    verifying: false,
    errorMessage: '',
    fallbackRequired: false,
    backgroundAt: null,
    ignoreResumeUntil: 0,
    // Signed-in, non-guest uid as last reported by syncUser().
    activeUid: null,
    _initialized: false,
  }),

  getters: {
    enabled: (state) => state.prefs?.enabled === true,
    timeoutMs: (state) => state.prefs?.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
    label: (state) => biometryLabel(state.biometryType),
    supported: (state) => isAppLockPlatform() && state.available,
    // Only lock when the person signed in is the one who turned the lock on.
    protecting: (state) => state.prefs?.enabled === true && !!state.activeUid && state.activeUid === state.prefs.uid,
  },

  actions: {
    async init() {
      if (this._initialized || !isAppLockPlatform()) return
      this._initialized = true
      await this.refreshAvailability()

      onBiometryChange((result) => {
        this.available = result.available
        this.biometryType = result.biometryType
        if (!this.locked || !this.enabled) return
        if (!result.available) {
          // Biometrics removed while locked: only a full sign-in can unlock now.
          this.fallbackRequired = true
          this.errorMessage = 'Biometric unlock isn’t available on this phone right now.'
        } else if (this.fallbackRequired) {
          this.fallbackRequired = false
          this.errorMessage = ''
        }
      })

      try {
        const { App } = await import('@capacitor/app')
        App.addListener('pause', () => this.handlePause())
        App.addListener('resume', () => this.handleResume())
      } catch {
        /* @capacitor/app unavailable */
      }
    },

    async refreshAvailability() {
      const result = await getBiometricAvailability()
      this.available = result.available
      this.biometryType = result.biometryType
      this.availabilityChecked = true
      if (this.locked && this.enabled && !result.available) {
        this.fallbackRequired = true
        this.errorMessage = `${this.label} isn’t available on this phone anymore.`
      }
    },

    // Keeps the lock tied to the signed-in account. `settled` is false while
    // auth is still bootstrapping, when a missing user is not yet meaningful.
    syncUser({ uid, isGuest, settled }) {
      if (uid && !isGuest) this.activeUid = uid
      else if (settled) this.activeUid = null
      if (!this.prefs) return
      if (uid && !isGuest && uid !== this.prefs.uid) {
        clearAppLockPrefs()
        this.prefs = null
        this.unlockState()
        return
      }
      if (settled && (!uid || isGuest)) {
        // Signed out elsewhere (expired session, other tab): nothing to protect.
        this.unlockState()
      }
    },

    handlePause() {
      if (!this.protecting || this.verifying) return
      this.backgroundAt = Date.now()
      this.obscured = true
    },

    handleResume() {
      const now = Date.now()
      if (!this.protecting || this.verifying || now < this.ignoreResumeUntil || !this.backgroundAt) {
        this.obscured = false
        return
      }
      const away = now - this.backgroundAt
      this.backgroundAt = null
      if (away >= Math.max(this.timeoutMs, MIN_BACKGROUND_MS_TO_LOCK)) {
        this.locked = true
        this.errorMessage = ''
      }
      this.obscured = false
    },

    unlockState() {
      this.locked = false
      this.obscured = false
      this.errorMessage = ''
      this.fallbackRequired = false
      this.backgroundAt = null
      this.ignoreResumeUntil = Date.now() + RESUME_GRACE_MS
    },

    async unlock() {
      if (this.verifying || this.fallbackRequired) return false
      this.verifying = true
      this.errorMessage = ''
      try {
        await verifyBiometric({ reason: 'Unlock PlanCraftAI', title: 'Unlock PlanCraftAI' })
        this.unlockState()
        return true
      } catch (err) {
        if (err?.kind === 'unavailable') this.fallbackRequired = true
        this.errorMessage = err?.message || ''
        return false
      } finally {
        this.verifying = false
        this.ignoreResumeUntil = Date.now() + RESUME_GRACE_MS
      }
    },

    // Throws { kind, message } from verifyBiometric so callers can show it.
    async enable(uid) {
      if (!uid) throw { kind: 'failed', message: 'Sign in first to turn on app lock.' }
      this.verifying = true
      try {
        await verifyBiometric({ reason: `Turn on ${this.label} for PlanCraftAI`, title: `Turn on ${this.label}` })
        this.prefs = { uid, enabled: true, timeoutMs: this.prefs?.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS }
        writeAppLockPrefs(this.prefs)
      } finally {
        this.verifying = false
        this.ignoreResumeUntil = Date.now() + RESUME_GRACE_MS
      }
    },

    // Requires a biometric check so someone holding an unlocked phone can't
    // simply switch protection off.
    async disable() {
      if (!this.prefs) return
      this.verifying = true
      try {
        await verifyBiometric({ reason: `Turn off ${this.label} for PlanCraftAI`, title: `Turn off ${this.label}` })
        this.prefs = { ...this.prefs, enabled: false }
        writeAppLockPrefs(this.prefs)
        this.unlockState()
      } finally {
        this.verifying = false
        this.ignoreResumeUntil = Date.now() + RESUME_GRACE_MS
      }
    },

    setTimeoutMs(ms) {
      if (!this.prefs) return
      this.prefs = { ...this.prefs, timeoutMs: ms }
      writeAppLockPrefs(this.prefs)
    },

    reset() {
      clearAppLockPrefs()
      this.prefs = null
      this.unlockState()
    },
  },
})
