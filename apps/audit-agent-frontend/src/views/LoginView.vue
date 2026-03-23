<template>
  <div class="login-shell relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950">
    <div class="absolute inset-0">
      <canvas ref="starsCanvas" class="w-full h-full opacity-70"></canvas>
    </div>

    <div class="relative z-10 w-full px-4 py-12 flex items-center justify-center">
      <div class="relative w-full max-w-3xl">
        <div class="login-glow" aria-hidden="true"></div>
        <div class="login-card relative bg-slate-900/75 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl px-8 py-10 sm:px-12 sm:py-12 text-white animate-fade-in">
          <div class="flex flex-col items-center text-center gap-5">
            <img src="/logo-bg-remove.png" alt="PlanCraftAI" class="w-16 h-16 drop-shadow-lg" />
            <div>
              <p class="text-sm uppercase tracking-[0.35em] text-indigo-300/80">Welcome back</p>
              <h1 class="text-3xl sm:text-4xl font-bold mt-2">PlanCraftAI</h1>
              <p class="text-indigo-100/90 mt-2 text-base">Your AI-powered productivity companion</p>
            </div>
            <LoginFeatureSlider class="value-props" />
          </div>

          <!-- Off-screen reCAPTCHA anchor (must be mounted in DOM) -->
          <div id="recaptcha-container" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;"></div>

          <div class="mt-10 space-y-5">
            <div class="auth-methods">
              <div class="auth-methods__header">
                <p class="auth-methods__eyebrow">Choose your sign-in method</p>
                <p class="auth-methods__caption">{{ authMethodsCaption }}</p>
              </div>
              <div class="auth-methods__grid">
                <button
                  v-if="!isNativeApp"
                  @click="loginGoogle"
                  :disabled="authUiBusy"
                  class="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-4 rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-70"
                >
                  <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" class="w-5 h-5" />
                  Continue with Google
                </button>
                <button
                  v-if="isIosApp && appleAuthEnabled"
                  @click="loginApple"
                  :disabled="authUiBusy"
                  class="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-4 rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-70"
                >
                  <img src="https://www.svgrepo.com/show/303128/apple-logo.svg" alt="Apple" class="w-5 h-5" />
                  Continue with Apple
                </button>
                <button
                  type="button"
                  :disabled="authUiBusy"
                  :class="['auth-mode-card', { 'auth-mode-card--active': showEmail }]"
                  @click="toggleEmail"
                  :aria-expanded="showEmail"
                >
                  <span class="auth-mode-card__icon">✉️</span>
                  <span class="auth-mode-card__body">
                    <span class="auth-mode-card__title">Continue with Email</span>
                    <span class="auth-mode-card__subtitle">Best for full account access and recovery</span>
                  </span>
                  <span class="auth-mode-card__badge">{{ showEmail ? 'Active' : 'Use' }}</span>
                </button>
                <button
                  v-if="showPhoneOtpOption"
                  type="button"
                  :disabled="authUiBusy"
                  :class="['auth-mode-card', { 'auth-mode-card--active': showPhone }]"
                  @click="togglePhone"
                  :aria-expanded="showPhone"
                >
                  <span class="auth-mode-card__icon">📱</span>
                  <span class="auth-mode-card__body">
                    <span class="auth-mode-card__title">Continue with Phone</span>
                    <span class="auth-mode-card__subtitle">Fast OTP sign-in built for mobile</span>
                  </span>
                  <span class="auth-mode-card__badge">{{ showPhone ? (otpSent ? 'Code sent' : 'Active') : 'Use' }}</span>
                </button>
              </div>
            </div>

            <transition name="auth-panel-swap" mode="out-in">
              <div v-if="showEmail" key="email" :class="['auth-panel', { 'auth-panel--shake': emailErrorShake }]">
                <div class="auth-panel__header">
                  <div>
                    <p class="auth-panel__eyebrow">{{ emailPanelEyebrow }}</p>
                    <h2 class="text-lg font-semibold text-white">{{ emailPanelTitle }}</h2>
                    <p class="auth-panel__hint">{{ emailPanelHint }}</p>
                  </div>
                </div>
                <div class="auth-panel-switch" role="tablist" aria-label="Email account flow">
                  <button
                    type="button"
                    class="auth-panel-switch__item"
                    :class="{ 'auth-panel-switch__item--active': !isRegisterMode }"
                    :disabled="authUiBusy"
                    :aria-selected="!isRegisterMode"
                    @click="setEmailAuthMode('signin')"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    class="auth-panel-switch__item"
                    :class="{ 'auth-panel-switch__item--active': isRegisterMode }"
                    :disabled="authUiBusy"
                    :aria-selected="isRegisterMode"
                    @click="setEmailAuthMode('register')"
                  >
                    Create account
                  </button>
                </div>
                <div class="space-y-3">
                  <input
                    v-if="isRegisterMode"
                    ref="displayNameFieldRef"
                    v-model="registerDisplayName"
                    type="text"
                    placeholder="Your name"
                    autocomplete="name"
                    :class="['auth-input', { 'auth-input--error': nameErrorActive }]"
                    @keydown.enter.prevent="onSubmitEmailAuth"
                  />
                  <input
                    ref="emailFieldRef"
                    v-model="email"
                    type="email"
                    placeholder="Email"
                    autocomplete="email"
                    :class="['auth-input', { 'auth-input--error': emailErrorActive }]"
                    @keydown.enter.prevent="onSubmitEmailAuth"
                  />
                  <input
                    ref="passwordFieldRef"
                    v-model="password"
                    type="password"
                    :placeholder="isRegisterMode ? 'Create password' : 'Password'"
                    :autocomplete="isRegisterMode ? 'new-password' : 'current-password'"
                    :class="['auth-input', { 'auth-input--error': passwordErrorActive }]"
                    @keydown.enter.prevent="onSubmitEmailAuth"
                  />
                  <input
                    v-if="isRegisterMode"
                    ref="confirmPasswordFieldRef"
                    v-model="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    autocomplete="new-password"
                    :class="['auth-input', { 'auth-input--error': confirmPasswordErrorActive }]"
                    @keydown.enter.prevent="onSubmitEmailAuth"
                  />
                  <p v-if="isRegisterMode" class="auth-help-text">
                    Use at least 8 characters. We will sign you in and take you straight to your workspace.
                  </p>
                  <p v-if="loginErrorMessage" class="auth-error" role="alert">{{ loginErrorMessage }}</p>
                  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-sm">
                    <button @click="onSubmitEmailAuth" :disabled="authUiBusy" class="auth-action primary">
                      {{ emailPrimaryActionLabel }}
                    </button>
                    <button @click="toggleEmailAuthMode" :disabled="authUiBusy" class="auth-action ghost">
                      {{ emailSecondaryActionLabel }}
                    </button>
                  </div>
                  <button
                    v-if="!isRegisterMode"
                    @click="onReset"
                    class="text-xs text-indigo-300 hover:text-indigo-200 transition text-left"
                  >
                    Forgot password?
                  </button>
                  <div v-if="!isRegisterMode && !isNativeApp" class="pt-3 border-t border-white/10">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-2">
                      <span class="text-indigo-100">Or get a magic link</span>
                      <button @click="onSendMagic" class="auth-action ghost px-4 py-2">
                        Send Link
                      </button>
                    </div>
                    <p v-if="magicSent" class="text-xs text-green-300 mt-2">Magic link sent! Check your email.</p>
                  </div>
                </div>
              </div>

              <div v-else-if="showPhone" key="phone" class="auth-panel">
                <div class="auth-panel__header">
                  <div>
                    <p class="auth-panel__eyebrow">{{ otpSent ? 'Step 2 of 2' : 'Quick mobile sign-in' }}</p>
                    <h2 class="text-lg font-semibold text-white">
                      {{ otpSent ? 'Enter your verification code' : 'Phone OTP' }}
                    </h2>
                    <p class="auth-panel__hint">
                      {{
                        otpSent
                          ? 'We sent a one-time code to your phone. Enter it below to finish signing in.'
                          : 'Use a one-time code for a fast, password-free login on this device.'
                      }}
                    </p>
                  </div>
                  <button v-if="otpSent" type="button" class="auth-inline-action" @click="resetOtpStep">
                    Use another number
                  </button>
                </div>
                <div class="space-y-3">
                  <div
                    class="auth-field-shell"
                    @click="focusPhoneField"
                    @touchstart.passive="focusPhoneField"
                  >
                    <span class="auth-field-shell__flag" aria-label="Detected country flag">{{ detectedFlag }}</span>
                    <input
                      ref="phoneFieldRef"
                      v-model="phoneInput"
                      type="tel"
                      placeholder="Enter phone e.g. +1 650 555 1234"
                      class="flex-1 bg-transparent text-white placeholder:text-indigo-200/60 focus:outline-none text-base py-2"
                      inputmode="tel"
                      autocomplete="tel"
                      :readonly="otpSent"
                      enterkeyhint="send"
                      @input="onPhoneInput"
                    />
                  </div>
                  <div v-if="otpSent" class="auth-status-row">
                    <span class="auth-status-pill">Code sent</span>
                    <span class="text-xs text-indigo-200/70">{{ phoneHint }}</span>
                  </div>
                  <p v-else class="text-xs text-indigo-200/70">{{ phoneHint }}</p>
                  <div v-if="!otpSent">
                    <button
                      @click="sendOtp"
                      :disabled="sendingOtp || !normalizedPhone"
                      class="auth-action primary w-full disabled:opacity-60"
                    >
                      {{ sendingOtp ? 'Sending…' : 'Send OTP' }}
                    </button>
                  </div>
                  <div v-else class="space-y-2">
                    <input
                      ref="otpFieldRef"
                      v-model="otp"
                      type="tel"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      autocomplete="one-time-code"
                      placeholder="Enter OTP"
                      class="auth-input"
                      enterkeyhint="done"
                      @input="sanitizeOtpInput"
                    />
                    <button
                      @click="verifyOtp"
                      :disabled="verifyingOtp || !otp"
                      class="auth-action primary w-full disabled:opacity-60"
                    >
                      {{ verifyingOtp ? 'Verifying…' : 'Verify & Sign In' }}
                    </button>
                  </div>
                </div>
              </div>

              <div v-else key="empty" class="auth-empty-state">
                <p class="auth-empty-state__title">Pick the path that feels easiest on this device.</p>
                <p class="auth-empty-state__hint">
                  Email is best when you want full account recovery. Phone OTP is great when you want a quick mobile sign-in.
                </p>
              </div>
            </transition>
          </div>

          <div class="mt-10 grid gap-3 sm:grid-cols-3 text-center text-xs sm:text-sm text-indigo-200/80">
            <div
              v-for="feature in featureHighlights"
              :key="feature.label"
              class="feature-pill flex flex-col items-center gap-1 px-3 py-3 rounded-2xl border border-white/5 bg-white/5"
            >
              <span class="text-lg">{{ feature.icon }}</span>
              <p class="font-semibold text-white text-sm">{{ feature.label }}</p>
              <p class="text-[11px] text-indigo-200/70">{{ feature.desc }}</p>
            </div>
          </div>

          <p class="text-xs text-indigo-200/80 text-center mt-8">
            Loved by students, founders, and busy professionals — trusted by 300+ planners.
          </p>

          <GoogleAuthDiagnostic v-if="!isNativeApp" class="mt-6" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/authStore"
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'
import LoginFeatureSlider from '@/components/LoginFeatureSlider.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { Capacitor } from '@capacitor/core'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const featureFlagsStore = useFeatureFlagsStore()
const starsCanvas = ref(null)
const isIosApp = computed(() => {
  try {
    return Capacitor?.getPlatform?.() === 'ios'
  } catch {
    return false
  }
})
useSeoMeta({
  title: 'Login | PlanCraft AI',
  description: 'Sign in to PlanCraft AI to access AI planning, calendar sync, and voice reminders.',
  canonicalPath: '/login',
  noindex: true,
})
const featureHighlights = [
  { icon: '🧠', label: 'Smart AI Task Planning', desc: 'Guided next steps' },
  { icon: '🔔', label: 'Auto Reminders', desc: 'Call · Text · WhatsApp · Email' },
  { icon: '📅', label: 'Calendar Sync', desc: 'Google + Outlook ready' },
]

if (route.query.guestFromLanding === '1') {
  router.replace({
    path: '/signup',
    query: {
      guest: '1',
      guestFromLanding: '1',
    },
  })
}

import { trackLinkedInConversion } from '@/utils/ads'
import { RecaptchaVerifier } from 'firebase/auth'
import { auth } from '@/firebase/init'
import { ElMessage } from 'element-plus'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { sendMagicLink, completeMagicLinkSignIn } from '@/services/authService'
import { trackSignupCompleted } from '@/services/analytics'
import GoogleAuthDiagnostic from '@/components/GoogleAuthDiagnostic.vue'
import {
  isNativePackagedApp,
  getNativeAuthRestriction,
} from '@/utils/nativeAuthSupport'
import {
  buildNativeAuthCallbackUrl,
  buildNativeAuthFallbackSchemeUrl,
  createMobileAuthHandoff,
  launchNativeAuthRoute,
  normalizeRedirectPath,
} from '@/services/mobileAuthHandoffService'

const isNativeApp = computed(() => isNativePackagedApp())
const appleAuthEnabled = computed(() => featureFlagsStore.isEnabled('APPLE_AUTH'))
const phoneAuthTestingEnabled =
  import.meta.env.DEV || import.meta.env.VITE_FIREBASE_PHONE_AUTH_TESTING === '1'
const SITE_URL = ((import.meta.env.VITE_SITE_URL && String(import.meta.env.VITE_SITE_URL)) || 'https://plancraftai.com')
  .replace(/\/+$/, '')

function mapAppleAuthErrorMessage(errorCode) {
  const code = String(errorCode || '').trim()
  if (!code) return ''
  switch (code) {
    case 'user_cancelled_authorize':
    case 'access_denied':
      return 'Apple sign-in was cancelled.'
    case 'apple_start_failed':
      return 'Apple sign-in could not be started. Check the mobile auth configuration and try again.'
    case 'apple_key_invalid':
      return 'Apple sign-in server key is invalid. Fix APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH on the backend and try again.'
    case 'invalid_client':
      return 'Apple sign-in server credentials are mismatched. Check APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_TEAM_ID, APPLE_PRIVATE_KEY, and APPLE_REDIRECT_URI.'
    case 'apple_callback_failed':
      return 'Apple sign-in did not finish correctly. Please try again.'
    default:
      return `Apple sign-in failed: ${code}`
  }
}

function clearAppleAuthErrorQuery() {
  const nextQuery = { ...route.query }
  delete nextQuery.appleAuthError
  router.replace({
    path: route.path,
    query: nextQuery,
  }).catch(() => {})
}

function surfaceAppleAuthError(errorCode) {
  const message = mapAppleAuthErrorMessage(errorCode)
  if (!message) return
  ElMessage.error(message)
  clearAppleAuthErrorQuery()
}

async function loginGoogle() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  try {
    await authStore.loginWithGoogle()
    if (authStore.user) await redirectAfterLogin()
  } catch (err) {
    console.warn('Google login failed; offering OTP fallback', err)
    if (err?.code === 'auth/native-google-unsupported') {
      try { ElMessage.info(getNativeAuthRestriction('google')) } catch {}
      setActiveAuthMode('email')
      return
    }
    if (err?.code === 'auth/native-google-link-unsupported') {
      try { ElMessage.info('Google account linking from inside the Android app is not available yet. Sign in directly instead.') } catch {}
      return
    }
    setActiveAuthMode('phone')
    try { ElMessage.info('Google sign-in unavailable. Try phone OTP.') } catch {}
  }
}

async function loginApple() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  try {
    await authStore.loginWithApple()
    if (authStore.user) await redirectAfterLogin()
  } catch (err) {
    console.warn('Apple login failed', err)
    if (err?.code === 'feature-disabled/apple-auth') {
      try { ElMessage.info(err?.message || 'Apple sign-in is temporarily disabled. Use OTP or email/password.') } catch {}
      setActiveAuthMode('email')
      return
    }
    if (err?.code === 'auth/native-apple-unsupported') {
      try { ElMessage.info(getNativeAuthRestriction('apple')) } catch {}
      setActiveAuthMode('email')
      return
    }
    try { ElMessage.info('Apple sign-in unavailable. Try another method.') } catch {}
  }
}

watch(
  () => route.query.appleAuthError,
  (value) => {
    if (typeof value === 'string' && value) {
      surfaceAppleAuthError(value)
    }
  },
  { immediate: true },
)

// Email auth
const activeAuthMode = ref(null)
const showEmail = computed(() => activeAuthMode.value === 'email')
const showPhoneOtpOption = computed(() => !(isNativeApp.value && isIosApp.value))
const showPhone = computed(() => showPhoneOtpOption.value && activeAuthMode.value === 'phone')
const emailAuthMode = ref('signin')
const isRegisterMode = computed(() => emailAuthMode.value === 'register')
const email = ref('')
const password = ref('')
const registerDisplayName = ref('')
const confirmPassword = ref('')
const magicSent = ref(false)
const displayNameFieldRef = ref(null)
const emailFieldRef = ref(null)
const passwordFieldRef = ref(null)
const confirmPasswordFieldRef = ref(null)
const loginErrorMessage = ref('')
const nameErrorActive = ref(false)
const emailErrorActive = ref(false)
const passwordErrorActive = ref(false)
const confirmPasswordErrorActive = ref(false)
const emailErrorShake = ref(false)
const emailSubmitting = ref(false)
const authUiBusy = computed(
  () => emailSubmitting.value || authStore.bootstrapping || authStore.authenticating || authStore.logoutPending,
)
const emailPanelEyebrow = computed(() => (isRegisterMode.value ? 'Create your account' : 'Secure email access'))
const emailPanelTitle = computed(() => (isRegisterMode.value ? 'Create account' : 'Email access'))
const emailPanelHint = computed(() => (
  isRegisterMode.value
    ? 'Create your account with email and password, then continue straight into your workspace.'
    : 'Use your email and password to restore your workspace, reminders, and account settings.'
))
const emailPrimaryActionLabel = computed(() => {
  if (!emailSubmitting.value) return isRegisterMode.value ? 'Create account' : 'Sign In'
  return isRegisterMode.value ? 'Creating your account...' : 'Signing you in...'
})
const emailSecondaryActionLabel = computed(() => (
  isRegisterMode.value ? 'Already have an account?' : 'Need an account?'
))
const authMethodsCaption = computed(() => (
  showPhoneOtpOption.value
    ? 'Email is best for full account access. Phone is fastest when you want a quick code on mobile.'
    : 'Use email or Apple sign-in in the iPhone app. Phone OTP is hidden here.'
))

function clearEmailAuthErrorState() {
  loginErrorMessage.value = ''
  nameErrorActive.value = false
  emailErrorActive.value = false
  passwordErrorActive.value = false
  confirmPasswordErrorActive.value = false
  emailErrorShake.value = false
}

function focusNode(node) {
  if (!node?.focus) return
  try {
    node.focus({ preventScroll: true })
  } catch {
    node.focus()
  }
}

function focusPrimaryEmailAuthField() {
  if (isRegisterMode.value) {
    focusNode(displayNameFieldRef.value)
    return
  }
  focusNode(emailFieldRef.value)
}

function focusEmailField() {
  focusNode(emailFieldRef.value)
}

function setEmailAuthMode(mode, { focus = true } = {}) {
  const nextMode = mode === 'register' ? 'register' : 'signin'
  if (emailAuthMode.value === nextMode) {
    if (focus && showEmail.value) {
      nextTick(() => focusPrimaryEmailAuthField())
    }
    return
  }
  emailAuthMode.value = nextMode
  clearEmailAuthErrorState()
  magicSent.value = false
  if (!isRegisterMode.value) {
    confirmPassword.value = ''
  }
  if (focus && showEmail.value) {
    nextTick(() => focusPrimaryEmailAuthField())
  }
}

function toggleEmailAuthMode() {
  setEmailAuthMode(isRegisterMode.value ? 'signin' : 'register')
}

function setActiveAuthMode(mode, { focus = true } = {}) {
  if (mode === 'phone' && !showPhoneOtpOption.value) {
    mode = 'email'
  }
  const nextMode = mode === 'email' || mode === 'phone' ? mode : null

  if (activeAuthMode.value === 'phone' && nextMode !== 'phone') {
    resetRecaptcha()
  }

  if (nextMode !== 'email') {
    clearEmailAuthErrorState()
  }

  activeAuthMode.value = nextMode

  if (nextMode === 'email' && focus) {
    nextTick(() => focusPrimaryEmailAuthField())
    return
  }

  if (nextMode === 'phone') {
    if (!otpSent.value) {
      window.setTimeout(() => {
        ensureRecaptcha()
      }, 0)
    }

    nextTick(() => {
      if (otpSent.value) {
        focusOtpField()
      } else {
        focusPhoneField()
      }
    })
  }
}

function triggerEmailErrorFeedback(
  message,
  {
    highlightName = false,
    highlightEmail = false,
    highlightPassword = true,
    highlightConfirmPassword = false,
  } = {},
) {
  loginErrorMessage.value = message
  nameErrorActive.value = highlightName
  emailErrorActive.value = highlightEmail
  passwordErrorActive.value = highlightPassword
  confirmPasswordErrorActive.value = highlightConfirmPassword
  emailErrorShake.value = false

  window.setTimeout(() => {
    emailErrorShake.value = true
  }, 0)

  window.setTimeout(() => {
    emailErrorShake.value = false
  }, 420)

  nextTick(() => {
    if (highlightName) {
      focusNode(displayNameFieldRef.value)
      return
    }
    if (highlightEmail) {
      focusNode(emailFieldRef.value)
      return
    }
    if (highlightConfirmPassword) {
      focusNode(confirmPasswordFieldRef.value)
      return
    }
    if (highlightPassword) {
      focusNode(passwordFieldRef.value)
    }
  })
}

watch([registerDisplayName, email, password, confirmPassword, emailAuthMode], () => {
  if (
    !loginErrorMessage.value &&
    !nameErrorActive.value &&
    !emailErrorActive.value &&
    !passwordErrorActive.value &&
    !confirmPasswordErrorActive.value
  ) return
  clearEmailAuthErrorState()
})

function validateEmailAuthForm(mode = emailAuthMode.value) {
  const normalizedEmail = String(email.value || '').trim()
  const normalizedName = String(registerDisplayName.value || '').trim().replace(/\s+/g, ' ')
  email.value = normalizedEmail
  registerDisplayName.value = normalizedName

  if (!normalizedEmail) {
    triggerEmailErrorFeedback('Enter your email address to continue.', {
      highlightEmail: true,
      highlightPassword: false,
    })
    return false
  }

  if (mode === 'register') {
    if (!normalizedName) {
      triggerEmailErrorFeedback('Add your name so we can personalize your workspace.', {
        highlightName: true,
        highlightPassword: false,
      })
      return false
    }
    if (!password.value) {
      triggerEmailErrorFeedback('Create a password to finish setting up your account.', {
        highlightPassword: true,
      })
      return false
    }
    if (String(password.value).length < 8) {
      triggerEmailErrorFeedback('Use a stronger password with at least 8 characters.', {
        highlightPassword: true,
      })
      return false
    }
    if (!confirmPassword.value) {
      triggerEmailErrorFeedback('Confirm your password to continue.', {
        highlightPassword: false,
        highlightConfirmPassword: true,
      })
      return false
    }
    if (password.value !== confirmPassword.value) {
      triggerEmailErrorFeedback('Passwords do not match yet.', {
        highlightPassword: true,
        highlightConfirmPassword: true,
      })
      return false
    }
    return true
  }

  if (!password.value) {
    triggerEmailErrorFeedback('Enter your password to sign in.', {
      highlightPassword: true,
    })
    return false
  }

  return true
}

async function onLoginEmail() {
  if (emailSubmitting.value) return
  clearEmailAuthErrorState()
  if (!validateEmailAuthForm('signin')) return
  emailSubmitting.value = true
  try {
    try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
    await authStore.loginWithEmail(email.value, password.value)
    if (authStore.user) await redirectAfterLogin()
  } catch (e) {
    const code = String(e?.code || e?.message || '')
    console.error('[Auth] LoginView email login failed', JSON.stringify({
      code: e?.code || null,
      message: e?.message || String(e),
    }))
    if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
      triggerEmailErrorFeedback('Incorrect email or password.')
      return
    }
    if (code.includes('timed out')) {
      ElMessage.error('Login timed out. Please try again.')
      return
    }
    ElMessage.error(`Login failed: ${code || 'unknown error'}`)
  } finally {
    emailSubmitting.value = false
  }
}

async function onRegister() {
  if (emailSubmitting.value) return
  clearEmailAuthErrorState()
  if (!validateEmailAuthForm('register')) return
  emailSubmitting.value = true
  try {
    try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
    await authStore.registerEmail(email.value, password.value, { displayName: registerDisplayName.value })
    if (authStore.user) await redirectAfterLogin()
  } catch (e) {
    const code = String(e?.code || e?.message || '')
    console.error('[Auth] LoginView email registration failed', JSON.stringify({
      code: e?.code || null,
      message: e?.message || String(e),
    }))
    if (code.includes('auth/email-already-in-use')) {
      setEmailAuthMode('signin', { focus: false })
      triggerEmailErrorFeedback('That email already has an account. Sign in instead.', {
        highlightEmail: true,
      })
      return
    }
    if (code.includes('auth/invalid-email')) {
      triggerEmailErrorFeedback('Enter a valid email address.', {
        highlightEmail: true,
        highlightPassword: false,
      })
      return
    }
    if (code.includes('auth/weak-password')) {
      triggerEmailErrorFeedback('Use a stronger password with at least 8 characters.', {
        highlightPassword: true,
      })
      return
    }
    if (code.includes('timed out')) {
      ElMessage.error('Account creation timed out. Please try again.')
      return
    }
    ElMessage.error('Could not create your account right now. Please try again.')
  } finally {
    emailSubmitting.value = false
  }
}

function onSubmitEmailAuth() {
  if (isRegisterMode.value) {
    return onRegister()
  }
  return onLoginEmail()
}

async function onReset() {
  if (!email.value) return ElMessage.warning('Enter your email above to reset')
  try {
    await authStore.resetPassword(email.value)
    ElMessage.success('Password reset email sent. Check inbox/spam.')
  } catch (e) {
    const code = String(e?.code || e?.message || '')
    if (code.includes('auth/invalid-email')) {
      ElMessage.error('Invalid email address')
    } else if (code.includes('auth/user-not-found')) {
      // Firebase may return this in some configurations
      ElMessage.success('If an account exists, a reset email has been sent.')
    } else {
      ElMessage.error('Failed to send reset email. Try again later.')
    }
  }
}

async function onSendMagic() {
  if (isNativeApp.value) {
    ElMessage.info(getNativeAuthRestriction('magic-link'))
    return
  }
  if (!email.value) return alert('Enter your email above to receive a link')
  try {
    await sendMagicLink(email.value)
    magicSent.value = true
  } catch (e) {
    console.warn('Magic link send failed', e)
    alert('Failed to send magic link. Please try again.')
  }
}

// Phone OTP auth
const phoneInput = ref('')
const otp = ref('')
const otpSent = ref(false)
const sendingOtp = ref(false)
const verifyingOtp = ref(false)
const phoneFieldRef = ref(null)
const otpFieldRef = ref(null)
let confirmationResult = null
const IS_LOCAL = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)

function focusPhoneField() {
  const node = phoneFieldRef.value
  if (!node?.focus) return
  try {
    node.focus({ preventScroll: true })
  } catch {
    node.focus()
  }
}

function focusOtpField() {
  const node = otpFieldRef.value
  if (!node?.focus) return
  try {
    node.focus({ preventScroll: true })
  } catch {
    node.focus()
  }
}

function resetRecaptcha() {
  try {
    if (window.recaptchaVerifier?.clear) {
      window.recaptchaVerifier.clear()
      window.recaptchaVerifier = null
    }
  } catch {}
}

function configurePhoneAuthTesting() {
  try {
    if (!auth?.settings) return
    auth.settings.appVerificationDisabledForTesting = !!phoneAuthTestingEnabled
  } catch {}
}

async function ensureRecaptcha(force = false) {
  try {
    const container = document.getElementById('recaptcha-container')
    if (!container) return null
    configurePhoneAuthTesting()

    let v = window.recaptchaVerifier
    const needsNew = force || !v
    if (needsNew) {
      resetRecaptcha()
      v = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible', callback: () => {} })
      window.recaptchaVerifier = v
      try { await v.render() } catch {}
      return v
    }
    // If container lost its iframe (HMR or rerender), rebuild
    const hasIframe = !!container.querySelector('iframe')
    if (!hasIframe) {
      try { v.clear() } catch {}
      v = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible', callback: () => {} })
      window.recaptchaVerifier = v
      try { await v.render() } catch {}
    }
    return v
  } catch (e) {
    // If container not in DOM yet, ignore; we'll retry on toggle
    return null
  }
}

async function togglePhone() {
  if (!showPhoneOtpOption.value) {
    setActiveAuthMode('email')
    return
  }
  setActiveAuthMode('phone')
}

function toggleEmail() {
  setActiveAuthMode('email')
}

const countryCodeHints = [
  { label: 'United States/Canada', code: '+1', flag: '🇺🇸' },
  { label: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { label: 'India', code: '+91', flag: '🇮🇳' },
  { label: 'Hungary', code: '+36', flag: '🇭🇺' },
  { label: 'Australia', code: '+61', flag: '🇦🇺' },
  { label: 'Singapore', code: '+65', flag: '🇸🇬' },
  { label: 'Germany', code: '+49', flag: '🇩🇪' },
  { label: 'France', code: '+33', flag: '🇫🇷' },
  { label: 'Brazil', code: '+55', flag: '🇧🇷' },
  { label: 'Mexico', code: '+52', flag: '🇲🇽' },
  { label: 'South Africa', code: '+27', flag: '🇿🇦' },
  { label: 'New Zealand', code: '+64', flag: '🇳🇿' },
  { label: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { label: 'Philippines', code: '+63', flag: '🇵🇭' },
  { label: 'Pakistan', code: '+92', flag: '🇵🇰' },
  { label: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { label: 'Indonesia', code: '+62', flag: '🇮🇩' },
  { label: 'Spain', code: '+34', flag: '🇪🇸' },
  { label: 'Italy', code: '+39', flag: '🇮🇹' },
]

const normalizedPhone = computed(() => {
  try {
    const raw = String(phoneInput.value || '').trim()
    if (!raw) return ''
    const parsed = parsePhoneNumberFromString(raw)
    if (parsed && parsed.isPossible()) return parsed.number
    return ''
  } catch {
    return ''
  }
})

const detectedFlag = computed(() => {
  const raw = String(phoneInput.value || '').trim()
  const parsed = parsePhoneNumberFromString(raw)
  if (parsed?.country) return flagFromIso(parsed.country)
  const hint = countryCodeHints.find((opt) => raw.startsWith(opt.code))
  return hint?.flag || '🌐'
})

const phoneHint = computed(() => {
  if (!isNativeApp.value && String(route.query.native_handoff || '').trim().toLowerCase() === 'ios-phone') {
    return 'Finish verification here and the app will reopen automatically.'
  }
  if (normalizedPhone.value) return `Will use ${normalizedPhone.value} (E.164)`
  return 'Use +<country code> then your number (e.g., +44..., +91..., +1...)'
})

function flagFromIso(iso) {
  try {
    return iso
      .toUpperCase()
      .split('')
      .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
      .join('')
  } catch {
    return '🌐'
  }
}

function onPhoneInput() {
  let val = String(phoneInput.value || '')
  // Keep only digits and plus
  val = val.replace(/[^\d+]/g, '')
  const hasPlus = val.startsWith('+')
  val = val.replace(/\+/g, '')
  if (hasPlus) val = `+${val}`
  phoneInput.value = val
}

function sanitizeOtpInput() {
  otp.value = String(otp.value || '').replace(/\D/g, '')
}

function resetOtpStep() {
  otpSent.value = false
  otp.value = ''
  confirmationResult = null
  window.setTimeout(() => {
    ensureRecaptcha(true)
  }, 0)
  nextTick(() => focusPhoneField())
}

function mapPhoneOtpError(error) {
  const code = String(error?.code || '').trim()
  const message = String(error?.message || '').trim()

  if (code === 'auth/invalid-phone-number') {
    return 'Enter a valid phone number in international format, for example +1 650 555 1234.'
  }
  if (code === 'auth/too-many-requests') {
    return 'OTP requests were throttled. Wait a bit before requesting another code.'
  }
  if (
    code === 'auth/captcha-check-failed' ||
    code === 'auth/invalid-app-credential' ||
    code === 'auth/app-not-authorized' ||
    code === 'auth/missing-client-identifier'
  ) {
    if (phoneAuthTestingEnabled) {
      return 'Firebase phone auth verification failed. For simulator testing, use a Firebase fictional phone number and verification code configured in the Firebase console.'
    }
    return 'Firebase phone auth verification failed in the mobile app. Test on a real device or enable VITE_FIREBASE_PHONE_AUTH_TESTING=1 for simulator testing with Firebase fictional numbers.'
  }
  if (code === 'auth/internal-error') {
    if (isNativeApp.value && isIosApp.value) {
      if (phoneAuthTestingEnabled) {
        return 'Firebase phone auth testing mode is enabled on iPhone. Use a Firebase fictional test number and verification code from the Firebase console.'
      }
      return 'Firebase phone OTP failed on this iPhone build. If this is a simulator, real SMS delivery will not work; use a Firebase fictional test number instead. If this is a physical iPhone, verify Firebase APNs phone-auth setup and try again.'
    }
    return 'Firebase phone auth hit an internal verification error. Check the phone auth setup and try again.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Phone sign-in is not enabled in Firebase Authentication for this project.'
  }
  if (code === 'auth/quota-exceeded') {
    return 'The Firebase phone auth quota has been exceeded. Try again later.'
  }
  if (message) return message
  return 'Failed to send OTP. Please check the phone auth configuration and try again.'
}

function resolvePostLoginRedirectTarget() {
  const nextParam = typeof route?.query?.next === 'string' && route.query.next.length ? route.query.next : null
  if (nextParam) {
    return normalizeRedirectPath(nextParam)
  }

  const q = route?.query?.redirect
  if (typeof q === 'string' && q.length) {
    return normalizeRedirectPath(q)
  }

  const routeMode = typeof route?.query?.mode === 'string' ? route.query.mode : ''
  const canUseStoredIntent =
    routeMode === 'team' ||
    routeMode === 'signIn' ||
    typeof route?.query?.oobCode === 'string' ||
    typeof route?.query?.apiKey === 'string'
  try {
    const stored = canUseStoredIntent ? localStorage.getItem('postLoginRedirect') : ''
    if (stored) {
      localStorage.removeItem('postLoginRedirect')
      return normalizeRedirectPath(stored)
    }
  } catch {}

  return '/dashboard'
}

function readNativeBrowserHandoffIntent() {
  try {
    const url = new URL(window.location.href)
    const rawMode = String(url.searchParams.get('native_handoff') || route.query.native_handoff || '').trim().toLowerCase()
    const provider = String(url.searchParams.get('native_provider') || route.query.native_provider || '').trim().toLowerCase()
    if (!rawMode || !provider) return null

    const [platform = '', method = ''] = rawMode.split('-', 2)
    if (!platform) return null

    const redirect = normalizeRedirectPath(
      url.searchParams.get('native_redirect') ||
      url.searchParams.get('redirect') ||
      route.query.native_redirect ||
      route.query.redirect ||
      localStorage.getItem('postLoginRedirect') ||
      '/dashboard',
    )

    return {
      mode: rawMode,
      platform,
      method: method || null,
      provider,
      redirect,
    }
  } catch {
    return null
  }
}

async function maybeReturnToNativeAppAfterLogin(target) {
  if (isNativeApp.value) return false

  const nativeHandoff = readNativeBrowserHandoffIntent()
  if (!nativeHandoff?.platform || !nativeHandoff?.provider) return false

  try {
    console.info('[Auth] Native browser handoff create:start', {
      platform: nativeHandoff.platform,
      provider: nativeHandoff.provider,
      redirect: target,
    })
    const handoff = await createMobileAuthHandoff({
      redirect: target,
      platform: nativeHandoff.platform,
      provider: nativeHandoff.provider,
    })
    const returnUrl = nativeHandoff.platform === 'ios'
      ? buildNativeAuthFallbackSchemeUrl({
          code: handoff?.code,
          redirect: handoff?.redirect || target,
          platform: nativeHandoff.platform,
          provider: nativeHandoff.provider,
        })
      : buildNativeAuthCallbackUrl({
          code: handoff?.code,
          redirect: handoff?.redirect || target,
          platform: nativeHandoff.platform,
          provider: nativeHandoff.provider,
        })
    console.info('[Auth] Native browser handoff create:success', {
      platform: nativeHandoff.platform,
      provider: nativeHandoff.provider,
      redirect: handoff?.redirect || target,
      hasCode: !!handoff?.code,
      returnUrl,
    })
    window.location.replace(returnUrl)
    return true
  } catch (error) {
    console.error('[Auth] Native browser handoff create:failed', {
      platform: nativeHandoff.platform,
      provider: nativeHandoff.provider,
      redirect: target,
      message: error?.message || String(error),
    })
    ElMessage.error('Signed in, but returning to the app failed. Continuing in the browser.')
    return false
  }
}

async function launchPhoneAuthInBrowser() {
  const redirectTarget = resolvePostLoginRedirectTarget()
  try {
    try {
      localStorage.setItem('postLoginRedirect', redirectTarget)
    } catch {}

    const url = new URL('/login', `${SITE_URL}/`)
    url.searchParams.set('phone', '1')
    url.searchParams.set('redirect', redirectTarget)
    url.searchParams.set('native_handoff', 'ios-phone')
    url.searchParams.set('native_provider', 'phone')
    url.searchParams.set('native_redirect', redirectTarget)

    await launchNativeAuthRoute(url.toString())
    ElMessage.info('Opening secure phone verification in your browser.')
  } catch (error) {
    console.error('[OTP] Failed to launch browser handoff', {
      message: error?.message || String(error),
      redirect: redirectTarget,
    })
    ElMessage.error('Could not open browser-based phone verification. Please try email sign-in.')
  }
}

async function sendOtp() {
  if (!normalizedPhone.value) return ElMessage.error('Enter a valid phone number.')
  try {
    sendingOtp.value = true
    let verifier = await ensureRecaptcha()
    if (!verifier) throw new Error('reCAPTCHA not ready. Please try again.')
    const formatted = normalizedPhone.value
    // Execute reCAPTCHA once to ensure a fresh token
    try { await verifier.verify() } catch (e) {
      // If element was removed, rebuild and retry once
      if (String(e?.message || '').toLowerCase().includes('removed')) {
        verifier = await ensureRecaptcha(true)
        await verifier.verify()
      } else {
        throw e
      }
    }
    // Use centralized store action
    confirmationResult = await authStore.sendPhoneOtp(formatted, verifier)
    otpSent.value = true
    nextTick(() => focusOtpField())
    ElMessage.success('OTP sent successfully!')
  } catch (error) {
    console.error('[OTP] send failed', {
      code: error?.code || null,
      message: error?.message || String(error),
      native: isNativeApp.value,
      ios: isIosApp.value,
      testing: phoneAuthTestingEnabled,
      phone: normalizedPhone.value,
    })
    resetRecaptcha()
    const msg = IS_LOCAL
      ? mapPhoneOtpError(error) || 'OTP send failed on localhost. Use a Firebase test number (e.g., +13614429376 code 123456) or try email/Google.'
      : mapPhoneOtpError(error)
    ElMessage.error(msg)
  } finally {
    sendingOtp.value = false
  }
}

async function verifyOtp() {
  const code = String(otp.value || '').replace(/\D/g, '')
  if (!code) return alert('Enter the OTP you received.')
  if (!confirmationResult) {
    ElMessage.error('OTP session expired. Please request a new code.')
    return
  }
  try {
    verifyingOtp.value = true
    await authStore.confirmPhoneOtp(confirmationResult, code)
    redirectAfterLogin()
  } catch (error) {
    console.error('[OTP] verify failed', error)
    const code = String(error?.code || '')
    if (code.includes('auth/code-expired')) {
      ElMessage.error('OTP expired. Please request a new code.')
    } else {
      ElMessage.error('Invalid OTP. Please try again.')
    }
  } finally {
    verifyingOtp.value = false
  }
}

async function redirectAfterLogin() {
  const target = resolvePostLoginRedirectTarget()

  try {
    console.info('[Auth] Redirecting after login', {
      target,
      from: route?.fullPath || window.location.pathname,
      hasAuthStoreUser: !!authStore.user,
      currentUid: authStore.user?.uid || null,
    })
    if (await maybeReturnToNativeAppAfterLogin(target)) {
      return
    }
    await router.push(target)
    console.info('[Auth] Redirect after login completed', {
      target,
      currentRoute: router.currentRoute.value?.fullPath || null,
    })
  } catch (error) {
    console.error('[Auth] Redirect after login failed', {
      target,
      message: error?.message || String(error),
    })
    throw error
  }
}

// --- Star animation ---
onMounted(() => {
  const canvas = starsCanvas.value
  const ctx = canvas.getContext("2d")
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5,
    speed: Math.random() * 0.5 + 0.2,
  }))

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "white"
    stars.forEach((star) => {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      ctx.fill()
      star.y += star.speed
      if (star.y > canvas.height) {
        star.y = 0
        star.x = Math.random() * canvas.width
      }
    })
    requestAnimationFrame(animate)
  }
  animate()

  if (isNativeApp.value) {
    setActiveAuthMode('email', { focus: false })
    return
  }

  if (showPhoneOtpOption.value && String(route.query.phone || '').trim() === '1') {
    setActiveAuthMode('phone', { focus: false })
    return
  }

  setActiveAuthMode('email', { focus: false })
})

// Handle magic-link return
onMounted(async () => {
  try {
    const user = await completeMagicLinkSignIn(window.location.href)
    if (user) {
      try { trackSignupCompleted({ method: 'email_link' }) } catch (_) {}
      redirectAfterLogin()
    }
  } catch (e) {
    // ignore when not a magic link
  }
})
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 0.8s ease forwards;
}

@keyframes glowPulse {
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 0.4;
  }
}

.login-glow {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 80%;
  height: 80%;
  background: radial-gradient(circle at 50% 50%, rgba(167, 139, 250, 0.5), transparent 65%);
  filter: blur(120px);
  opacity: 0.5;
  animation: glowPulse 6s ease-in-out infinite;
  pointer-events: none;
}

.login-shell {
  overflow-y: auto;
  padding-top: max(3rem, env(safe-area-inset-top));
  padding-bottom: max(2rem, env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

.login-shell::-webkit-scrollbar {
  width: 0;
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(100%, 760px);
}

.value-props {
  animation: fade-in 1s ease forwards;
  width: min(100%, 560px);
}

.auth-methods {
  display: grid;
  gap: 1rem;
}

.auth-methods__header {
  display: grid;
  gap: 0.35rem;
}

.auth-methods__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(191, 219, 254, 0.72);
}

.auth-methods__caption {
  margin: 0;
  color: rgba(199, 210, 254, 0.72);
  line-height: 1.6;
}

.auth-methods__grid {
  display: grid;
  gap: 0.85rem;
}

.auth-mode-card {
  display: flex;
  align-items: center;
  gap: 0.95rem;
  width: 100%;
  padding: 1rem 1.1rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.56);
  color: #fff;
  text-align: left;
  transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
}

.auth-mode-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(165, 180, 252, 0.4);
}

.auth-mode-card--active {
  border-color: rgba(192, 132, 252, 0.55);
  background:
    linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(99, 102, 241, 0.12)),
    rgba(15, 23, 42, 0.72);
  box-shadow: 0 14px 40px rgba(76, 29, 149, 0.22);
}

.auth-mode-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 1.15rem;
  flex-shrink: 0;
}

.auth-mode-card__body {
  display: grid;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}

.auth-mode-card__title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.auth-mode-card__subtitle {
  color: rgba(199, 210, 254, 0.72);
  font-size: 0.88rem;
  line-height: 1.45;
}

.auth-mode-card__badge {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(224, 231, 255, 0.92);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.auth-panel {
  margin-top: 1rem;
  padding: 1.25rem;
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

.auth-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.auth-panel__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(196, 181, 253, 0.8);
}

.auth-panel__hint {
  margin: 0.35rem 0 0;
  color: rgba(199, 210, 254, 0.72);
  line-height: 1.55;
}

.auth-panel-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
  padding: 0.35rem;
  margin-bottom: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.45);
}

.auth-panel-switch__item {
  border: none;
  border-radius: 0.85rem;
  padding: 0.7rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(199, 210, 254, 0.78);
  background: transparent;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.auth-panel-switch__item:hover:not(:disabled) {
  color: #fff;
}

.auth-panel-switch__item--active {
  color: #fff;
  background: linear-gradient(120deg, rgba(168, 85, 247, 0.28), rgba(99, 102, 241, 0.24));
  box-shadow: inset 0 0 0 1px rgba(192, 132, 252, 0.28);
}

.auth-panel--shake {
  animation: auth-shake 0.34s ease;
}

.auth-panel-swap-enter-active,
.auth-panel-swap-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.auth-panel-swap-enter-from,
.auth-panel-swap-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes auth-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-7px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(3px);
  }
}

.auth-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
}

.auth-input:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.6);
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
}

.auth-input--error {
  border-color: rgba(248, 113, 113, 0.82);
  box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.22);
}

.auth-input::placeholder {
  color: rgba(226, 232, 240, 0.65);
}

.auth-error {
  margin: -0.2rem 0 0;
  color: rgb(252, 165, 165);
  font-size: 0.88rem;
  line-height: 1.4;
}

.auth-help-text {
  margin: -0.1rem 0 0;
  color: rgba(196, 181, 253, 0.82);
  font-size: 0.82rem;
  line-height: 1.5;
}

.auth-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.9rem;
  padding: 0.65rem 1.25rem;
  font-weight: 600;
  transition: all 0.2s ease;
  border: none;
}

.auth-action.primary {
  background: linear-gradient(120deg, #a855f7, #6366f1);
  color: white;
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.35);
}

.auth-action.primary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.auth-action.ghost {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(226, 232, 240, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.auth-link {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(165, 180, 252, 0.4);
  text-underline-offset: 4px;
  transition: color 0.2s ease;
}

.auth-link:hover {
  color: #c7d2fe;
}

.auth-empty-state {
  margin-top: 1rem;
  padding: 1.2rem 1.25rem;
  border-radius: 1.2rem;
  border: 1px dashed rgba(165, 180, 252, 0.26);
  background: rgba(15, 23, 42, 0.36);
  text-align: center;
}

.auth-empty-state__title {
  margin: 0;
  color: #fff;
  font-weight: 600;
}

.auth-empty-state__hint {
  margin: 0.5rem 0 0;
  color: rgba(199, 210, 254, 0.72);
  line-height: 1.55;
}

.auth-inline-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(99, 102, 241, 0.12);
  color: rgba(224, 231, 255, 0.92);
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.2s ease, transform 0.2s ease;
}

.auth-inline-action:hover {
  background: rgba(99, 102, 241, 0.2);
  transform: translateY(-1px);
}

.auth-field-shell {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  padding: 0.2rem 1rem;
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: text;
}

.auth-field-shell:focus-within {
  border-color: rgba(129, 140, 248, 0.6);
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
}

.auth-field-shell__flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  font-size: 1.5rem;
}

.auth-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.auth-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.14);
  color: rgba(187, 247, 208, 0.92);
  font-size: 0.75rem;
  font-weight: 700;
}

.feature-pill {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 1.25rem;
}

.native-auth-banner {
  margin-top: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: rgba(120, 53, 15, 0.22);
  color: rgba(254, 240, 138, 0.95);
  font-size: 0.9rem;
  line-height: 1.5;
}

.auth-phone-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.auth-select :deep(.el-input__wrapper) {
  height: 52px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
  box-shadow: none;
}

.auth-select :deep(.el-input__inner) {
  color: #e5e7eb;
}

.auth-select-dropdown {
  background: #0b1224 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.auth-select-dropdown .el-select-dropdown__item {
  color: #e5e7eb;
}

.auth-select-dropdown .el-select-dropdown__item.selected {
  color: #a5b4fc;
  font-weight: 700;
}

.auth-phone-input {
  height: 52px;
  border-radius: 12px;
}

@media (min-width: 640px) {
  .auth-methods__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .login-shell {
    align-items: flex-start;
  }

  .login-card {
    padding: 1.5rem 1.15rem;
    border-radius: 1.75rem;
  }

  .auth-methods__caption {
    font-size: 0.92rem;
  }

  .auth-mode-card {
    align-items: flex-start;
    padding: 0.95rem;
  }

  .auth-mode-card__badge {
    align-self: center;
  }

  .auth-panel {
    padding: 1rem;
  }

  .auth-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .auth-inline-action {
    width: 100%;
  }

  .auth-panel-switch {
    padding: 0.3rem;
  }
}
</style>
