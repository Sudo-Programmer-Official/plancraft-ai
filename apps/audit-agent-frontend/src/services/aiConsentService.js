import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

export const AI_CONSENT_PROMPT_EVENT = 'pcai:ai-consent-prompt'

const AI_CONSENT_STORAGE_KEY = 'pcai_ai_consent_v1'
const PROMPT_TIMEOUT_MS = 30_000

let pendingConsentPromise = null
let pendingConsentResolve = null
let pendingConsentTimer = null

export function requiresAiConsent() {
  return isNativePackagedApp()
}

export function getAiConsentStatus() {
  if (!requiresAiConsent()) return 'granted'
  try {
    const stored = localStorage.getItem(AI_CONSENT_STORAGE_KEY)
    if (stored === 'granted' || stored === 'declined') return stored
  } catch {}
  return 'unknown'
}

export function hasAiConsent() {
  return getAiConsentStatus() === 'granted'
}

export function submitAiConsentDecision(granted) {
  const status = granted ? 'granted' : 'declined'
  try {
    localStorage.setItem(AI_CONSENT_STORAGE_KEY, status)
  } catch {}

  if (pendingConsentTimer) {
    clearTimeout(pendingConsentTimer)
    pendingConsentTimer = null
  }

  if (pendingConsentResolve) {
    pendingConsentResolve(!!granted)
    pendingConsentResolve = null
    pendingConsentPromise = null
  }
}

export function openAiConsentPrompt(source = 'ai-feature') {
  if (!requiresAiConsent() || typeof window === 'undefined') return false
  try {
    window.dispatchEvent(new CustomEvent(AI_CONSENT_PROMPT_EVENT, { detail: { source } }))
    return true
  } catch {
    return false
  }
}

export async function ensureAiConsent(options = {}) {
  if (!requiresAiConsent()) return true
  if (hasAiConsent()) return true

  if (!pendingConsentPromise) {
    pendingConsentPromise = new Promise((resolve) => {
      pendingConsentResolve = resolve
      const prompted = openAiConsentPrompt(options.source || 'ai-feature')
      if (!prompted) {
        pendingConsentResolve = null
        pendingConsentPromise = null
        resolve(false)
        return
      }
      pendingConsentTimer = window.setTimeout(() => {
        submitAiConsentDecision(false)
      }, PROMPT_TIMEOUT_MS)
    })
  }

  return pendingConsentPromise
}

export async function ensureAiConsentOrThrow(options = {}) {
  const granted = await ensureAiConsent(options)
  if (granted) return true

  const error = new Error(
    'AI features stay off until you allow secure third-party AI processing in the app.',
  )
  error.code = 'AI_CONSENT_REQUIRED'
  throw error
}
