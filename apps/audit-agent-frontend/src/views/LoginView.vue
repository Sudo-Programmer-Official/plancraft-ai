<template>
  <div class="marketing-light login-shell relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950">
    <div class="absolute inset-0">
      <canvas ref="starsCanvas" class="w-full h-full opacity-70"></canvas>
    </div>

    <div class="login-frame relative z-10 w-full px-4 flex items-center justify-center">
      <div class="relative w-full max-w-md">
        <div class="login-glow" aria-hidden="true"></div>
        <div class="login-card relative bg-slate-900/75 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl text-white animate-fade-in">
          <header class="login-header">
            <img
              src="/icons/icon-96x96.png"
              srcset="/icons/icon-96x96.png 1x, /icons/icon-192x192.png 2x"
              alt=""
              width="44"
              height="44"
              class="login-header__logo"
            />
            <div class="login-header__copy">
              <h1 class="login-header__title">
                {{ showEmail && isRegisterMode ? 'Create your PlanCraftAI account' : 'Sign in to PlanCraftAI' }}
              </h1>
              <p class="login-header__subtitle">
                {{ isRegisterMode ? 'Create your account to plan with AI, voice, and smart reminders.' : 'Plan your day with AI, voice, and smart reminders.' }}
              </p>
            </div>
          </header>

          <!-- Off-screen reCAPTCHA anchor (must be mounted in DOM) -->
          <div id="recaptcha-container" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;"></div>

          <div v-if="appHandoffProvider === 'google'" class="native-auth-banner" role="status">
            <template v-if="appHandoffSessionEmail">
              <p>Signed in as <strong>{{ appHandoffSessionEmail }}</strong>.</p>
              <div class="flex flex-col sm:flex-row gap-2 mt-3">
                <button type="button" class="auth-action primary" :disabled="authUiBusy" @click="continueExistingSessionToApp">
                  Continue to the app
                </button>
                <button type="button" class="auth-action ghost" :disabled="authUiBusy" @click="useAnotherAccountForApp">
                  Use another account
                </button>
              </div>
            </template>
            <p v-else>Continue with Google below and we will take you back to the PlanCraftAI app.</p>
          </div>

          <div class="auth-providers">
            <button type="button" class="auth-provider" :disabled="authUiBusy" @click="loginGoogle">
              <img src="/icons/google-g.svg" alt="" class="w-5 h-5" />
              Continue with Google
            </button>
            <button
              v-if="appleAuthEnabled && (isIosApp || route.query.save_plan === '1')"
              type="button"
              class="auth-provider"
              :disabled="authUiBusy"
              @click="loginApple"
            >
              <img src="/icons/apple-logo.svg" alt="" class="w-5 h-5" />
              Continue with Apple
            </button>
          </div>

          <div class="auth-divider" role="separator"><span>or</span></div>

          <transition name="auth-panel-swap" mode="out-in">
            <div v-if="showEmail" key="email" :class="['auth-panel--flat', { 'auth-panel--shake': emailErrorShake }]">
              <div class="auth-panel-switch" role="tablist" aria-label="Email account flow">
                <button
                  type="button"
                  role="tab"
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
                  role="tab"
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
                  :placeholder="isRegisterMode ? 'Create password (8+ characters)' : 'Password'"
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
                <p v-if="loginErrorMessage" class="auth-error" role="alert">{{ loginErrorMessage }}</p>
                <button type="button" :disabled="authUiBusy" class="auth-action primary w-full" @click="onSubmitEmailAuth">
                  {{ emailPrimaryActionLabel }}
                </button>
                <div v-if="!isRegisterMode" class="auth-links">
                  <button type="button" class="auth-link-button" @click="onReset">Forgot password?</button>
                  <button v-if="!isNativeApp" type="button" class="auth-link-button" @click="onSendMagic">
                    Email me a sign-in link
                  </button>
                </div>
                <p v-if="magicSent" class="text-xs text-green-300">Sign-in link sent! Check your email.</p>
              </div>
            </div>

            <div v-else-if="showPhone" key="phone" class="auth-panel--flat">
              <div class="auth-phone-header">
                <p class="text-sm text-indigo-100/85">
                  {{ otpSent ? 'Enter the 6-digit code we sent to your phone.' : 'We will text you a one-time code. No password needed.' }}
                </p>
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
                    type="button"
                    @click="sendOtp"
                    :disabled="sendingOtp || !normalizedPhone"
                    class="auth-action primary w-full disabled:opacity-60"
                  >
                    {{ sendingOtp ? 'Sending…' : 'Send code' }}
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
                    placeholder="6-digit code"
                    class="auth-input"
                    enterkeyhint="done"
                    @input="sanitizeOtpInput"
                    @keydown.enter.prevent="verifyOtp"
                  />
                  <button
                    type="button"
                    @click="verifyOtp"
                    :disabled="verifyingOtp || otp.length < 6"
                    class="auth-action primary w-full disabled:opacity-60"
                  >
                    {{ verifyingOtp ? 'Verifying…' : 'Verify & Sign In' }}
                  </button>
                  <button
                    type="button"
                    class="auth-inline-action w-full"
                    :disabled="sendingOtp || otpCooldownSeconds > 0"
                    @click="resendOtp"
                  >
                    {{ otpCooldownSeconds > 0 ? `Resend code in ${otpCooldownSeconds}s` : 'Resend code' }}
                  </button>
                </div>
              </div>
            </div>
          </transition>

          <div v-if="showPhoneOtpOption" class="auth-mode-switch">
            <button
              type="button"
              class="auth-link-button"
              :disabled="authUiBusy"
              @click="showPhone ? toggleEmail() : togglePhone()"
            >
              {{ showPhone ? 'Use email instead' : 'Use phone number instead' }}
            </button>
          </div>

          <GoogleAuthDiagnostic v-if="!isNativeApp" class="mt-6" />
        </div>

        <div class="login-highlights grid gap-3 grid-cols-3 text-center text-xs text-indigo-200/80">
          <div
            v-for="feature in featureHighlights"
            :key="feature.label"
            class="feature-pill flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border border-white/5"
          >
            <span class="text-lg" aria-hidden="true">{{ feature.icon }}</span>
            <p class="font-semibold text-white text-xs sm:text-sm">{{ feature.label }}</p>
          </div>
        </div>
        <InAppBrowserWarning
          v-if="showInAppWarning"
          :redirect-url="inAppRedirectUrl"
          :on-continue="() => setActiveAuthMode('email')"
          @close="showInAppWarning = false"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/authStore"
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'
import { useStarfield } from '@/composables/useStarfield'
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
  { icon: '🧠', label: 'AI task planning' },
  { icon: '🔔', label: 'Smart reminders' },
  { icon: '📅', label: 'Calendar sync' },
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
import { RecaptchaVerifier, signOut } from 'firebase/auth'
import { auth } from '@/firebase/init'
import { ElMessage } from 'element-plus'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { sendMagicLink, completeMagicLinkSignIn } from '@/services/authService'
import { trackSignupCompleted, trackSignupStarted, trackSignInCompleted } from '@/services/analytics'
import GoogleAuthDiagnostic from '@/components/GoogleAuthDiagnostic.vue'
import InAppBrowserWarning from '@/components/InAppBrowserWarning.vue'
import { isInAppBrowser } from '@/utils/inAppBrowser'
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

const showInAppWarning = ref(false)
const inAppRedirectUrl = ref('')

function openInAppBrowserWarning() {
  inAppRedirectUrl.value = window.location.href
  showInAppWarning.value = true
}

async function loginGoogle() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  trackSignupStarted('google')
  if (isNativeApp.value) {
    // Google OAuth cannot run inside the app WebView; sign in on the web in
    // the system browser and hand the session back via the app link.
    await launchProviderAuthInBrowser('google')
    return
  }
  if (isInAppBrowser()) {
    openInAppBrowserWarning()
    return
  }
  try {
    await authStore.loginWithGoogle({ preferRedirect: appHandoffProvider.value === 'google' })
    if (authStore.user) await redirectAfterLogin()
  } catch (err) {
    console.warn('Google login failed', err)
    const code = String(err?.code || '')
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return
    }
    if (code === 'auth/in-app-browser') {
      openInAppBrowserWarning()
      return
    }
    if (code === 'auth/popup-blocked') {
      try { ElMessage.warning('Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.') } catch {}
      return
    }
    if (code === 'auth/native-google-unsupported') {
      try { ElMessage.info(getNativeAuthRestriction('google')) } catch {}
      setActiveAuthMode('email')
      return
    }
    if (err?.code === 'auth/native-google-link-unsupported') {
      try { ElMessage.info('Google account linking from inside the Android app is not available yet. Sign in directly instead.') } catch {}
      return
    }
    setActiveAuthMode('email')
    try { ElMessage.error('Google sign-in did not finish. Try again, or use email instead.') } catch {}
  }
}

async function loginApple() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  trackSignupStarted('apple')
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
// Email is the default panel; phone replaces it when chosen.
const activeAuthMode = ref('email')
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
const emailPrimaryActionLabel = computed(() => {
  if (!emailSubmitting.value) return isRegisterMode.value ? 'Create account' : 'Sign In'
  return isRegisterMode.value ? 'Creating your account...' : 'Signing you in...'
})

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
    trackSignupStarted('email', 'login')
    await authStore.loginWithEmail(email.value, password.value)
    if (authStore.user) await redirectAfterLogin()
  } catch (e) {
    const code = String(e?.code || e?.message || '')
    console.error('[Auth] LoginView email login failed', JSON.stringify({
      code: e?.code || null,
      message: e?.message || String(e),
    }))
    if (code.includes('auth/user-not-found')) {
      triggerEmailErrorFeedback('No account found for this email. Create an account first.', {
        highlightEmail: true,
        highlightPassword: false,
      })
      return
    }
    if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
      triggerEmailErrorFeedback('Incorrect email or password.')
      return
    }
    if (code.includes('auth/identity-conflict')) {
      triggerEmailErrorFeedback(e?.message || 'That email already belongs to another account.', {
        highlightEmail: true,
        highlightPassword: false,
      })
      return
    }
    if (code.includes('auth/too-many-requests')) {
      triggerEmailErrorFeedback('Too many attempts. Wait a minute or reset your password.', {
        highlightPassword: false,
      })
      return
    }
    if (code.includes('timed out') || code.includes('auth/network-request-failed')) {
      ElMessage.error('Login timed out. Check your connection and try again.')
      return
    }
    ElMessage.error('Could not sign you in right now. Please try again.')
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
    trackSignupStarted('email', 'register')
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
    ElMessage.success('Password reset email sent. Check inbox/spam and continue in the browser.')
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
const otpCooldownSeconds = ref(0)
let otpCooldownTimer = null
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
  stopOtpCooldown()
  otpSent.value = false
  otp.value = ''
  confirmationResult = null
  window.setTimeout(() => {
    ensureRecaptcha(true)
  }, 0)
  nextTick(() => focusPhoneField())
}

function stopOtpCooldown() {
  if (otpCooldownTimer) {
    window.clearInterval(otpCooldownTimer)
    otpCooldownTimer = null
  }
  otpCooldownSeconds.value = 0
}

function startOtpCooldown(seconds = 30) {
  stopOtpCooldown()
  otpCooldownSeconds.value = Math.max(0, Number(seconds) || 30)
  otpCooldownTimer = window.setInterval(() => {
    otpCooldownSeconds.value = Math.max(0, otpCooldownSeconds.value - 1)
    if (!otpCooldownSeconds.value) stopOtpCooldown()
  }, 1000)
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

  return '/today'
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
      '/today',
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

async function launchProviderAuthInBrowser(provider) {
  const redirectTarget = resolvePostLoginRedirectTarget()
  const platform = isIosApp.value ? 'ios' : 'android'
  try {
    try {
      localStorage.setItem('postLoginRedirect', redirectTarget)
    } catch {}

    const url = new URL('/login', `${SITE_URL}/`)
    if (provider === 'phone') url.searchParams.set('phone', '1')
    url.searchParams.set('redirect', redirectTarget)
    url.searchParams.set('native_handoff', `${platform}-${provider}`)
    url.searchParams.set('native_provider', provider)
    url.searchParams.set('native_redirect', redirectTarget)

    await launchNativeAuthRoute(url.toString())
  } catch (error) {
    console.error('[Auth] Failed to launch browser sign-in', {
      provider,
      message: error?.message || String(error),
      redirect: redirectTarget,
    })
    ElMessage.error('Could not open the browser to sign in. Please try email sign-in.')
  }
}

// Set on the web page the native app opens for browser-based sign-in.
const appHandoffProvider = computed(() => {
  if (isNativeApp.value) return ''
  return String(route.query.native_provider || '').trim().toLowerCase()
})

const appHandoffSessionEmail = computed(() => {
  if (!appHandoffProvider.value || !authStore.user?.uid) return ''
  if (authStore.guest === true || authStore.user?.mode === 'guest') return ''
  return authStore.user.email || authStore.user.displayName || 'your account'
})

async function continueExistingSessionToApp() {
  await redirectAfterLogin()
}

async function useAnotherAccountForApp() {
  // authStore.logout() reloads a bare /login and would drop the handoff params.
  try {
    await signOut(auth)
  } catch {}
  authStore.resetAuth()
}

async function sendOtp({ resend = false } = {}) {
  if (!normalizedPhone.value) return ElMessage.error('Enter a valid phone number.')
  if (sendingOtp.value || (resend && otpCooldownSeconds.value > 0)) return
  try {
    sendingOtp.value = true
    if (resend) resetRecaptcha()
    else trackSignupStarted('phone')
    const verifier = await ensureRecaptcha(resend)
    if (!verifier) throw new Error('reCAPTCHA not ready. Please try again.')
    const formatted = normalizedPhone.value
    // signInWithPhoneNumber owns the reCAPTCHA challenge. Calling verify()
    // manually first can consume the challenge and make a fresh OTP expire.
    confirmationResult = await authStore.sendPhoneOtp(formatted, verifier)
    otpSent.value = true
    startOtpCooldown(30)
    nextTick(() => focusOtpField())
    ElMessage.success('OTP sent successfully!')
  } catch (error) {
    console.error('[OTP] send failed', {
      code: error?.code || null,
      message: error?.message || String(error),
      native: isNativeApp.value,
      ios: isIosApp.value,
      testing: phoneAuthTestingEnabled,
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

async function resendOtp() {
  await sendOtp({ resend: true })
}

async function verifyOtp() {
  if (verifyingOtp.value) return
  const code = String(otp.value || '').replace(/\D/g, '')
  if (code.length < 6) return ElMessage.error('Enter the 6-digit code you received.')
  if (!confirmationResult) {
    ElMessage.error('OTP session expired. Please request a new code.')
    return
  }
  try {
    verifyingOtp.value = true
    await authStore.confirmPhoneOtp(confirmationResult, code)
    stopOtpCooldown()
    redirectAfterLogin()
  } catch (error) {
    console.error('[OTP] verify failed', {
      code: error?.code || null,
      message: error?.message || String(error),
    })
    const code = String(error?.code || '')
    if (code.includes('auth/identity-conflict')) {
      ElMessage.error(error?.message || 'That phone number is linked to another account. Sign in to that account first.')
    } else if (code.includes('auth/code-expired')) {
      confirmationResult = null
      stopOtpCooldown()
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

  if (route.query.save_plan === '1') {
    trackSignInCompleted({
      source: 'save_plan_prompt',
      method: String(route.query.auth_method || 'unknown'),
    })
  }

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

useStarfield(starsCanvas)

onMounted(() => {
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

onBeforeUnmount(() => {
  stopOtpCooldown()
  resetRecaptcha()
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
  padding-top: max(1.5rem, calc(env(safe-area-inset-top) + 0.75rem));
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

.login-shell::-webkit-scrollbar {
  width: 0;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 1.75rem 2rem;
  display: grid;
  gap: 1.1rem;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.login-header__logo {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  margin-top: 0;
  border-radius: 0.45rem;
  filter: drop-shadow(0 5px 12px rgba(31, 41, 55, 0.22));
}

.login-header__copy {
  width: 100%;
}

.login-header__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.25;
}

.login-header__subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
  color: rgba(224, 231, 255, 0.78);
}

.auth-providers {
  display: grid;
  gap: 0.65rem;
}

.auth-provider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3rem;
  border-radius: 0.9rem;
  background: #fff;
  color: #111827;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.auth-provider:hover:not(:disabled) {
  transform: translateY(-1px);
}

.auth-provider:focus-visible {
  outline: 2px solid #c084fc;
  outline-offset: 2px;
}

.auth-provider:disabled {
  opacity: 0.7;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(199, 210, 254, 0.6);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.auth-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
}

.auth-link-button {
  background: none;
  border: none;
  padding: 0.25rem 0;
  font-size: 0.85rem;
  color: rgb(165, 180, 252);
  text-decoration: underline;
  text-decoration-color: rgba(165, 180, 252, 0.35);
  text-underline-offset: 3px;
}

.auth-link-button:hover:not(:disabled) {
  color: #e0e7ff;
}

.auth-mode-switch {
  text-align: center;
}

.auth-phone-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.login-highlights {
  margin-top: 1rem;
}



















.auth-panel-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
  padding: 0;
  margin-bottom: 1rem;
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

/* Keep authentication aligned with the light marketing surface. The login
   controls used to inherit translucent dark-theme colors, which made the
   subtitle, tabs, links, and helper text look disabled on the light canvas. */
.marketing-light.login-shell {
  color-scheme: light;
  background: #f6f7fc !important;
  color: #0f172a !important;
}

.marketing-light.login-shell .login-glow {
  background: radial-gradient(circle at 50% 50%, rgba(129, 140, 248, 0.2), transparent 65%);
  opacity: 0.7;
}

.marketing-light.login-shell .login-card {
  background: rgba(255, 255, 255, 0.94) !important;
  border-color: #e2e8f0 !important;
  color: #0f172a !important;
  box-shadow: 0 24px 70px -36px rgba(15, 23, 42, 0.45);
}

.marketing-light.login-shell .login-header__title,
.marketing-light.login-shell .login-header__subtitle,
.marketing-light.login-shell .auth-phone-header p,
.marketing-light.login-shell .login-highlights,
.marketing-light.login-shell .feature-pill p {
  opacity: 1;
}

.marketing-light.login-shell .login-header__title,
.marketing-light.login-shell .feature-pill p {
  color: #0f172a !important;
}

.marketing-light.login-shell .login-header__subtitle,
.marketing-light.login-shell .auth-divider,
.marketing-light.login-shell .auth-phone-header p,
.marketing-light.login-shell .login-highlights,
.marketing-light.login-shell .auth-status-row .text-xs,
.marketing-light.login-shell .auth-phone-header + .space-y-3 > p {
  color: #64748b !important;
}

.marketing-light.login-shell .auth-provider {
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 28px -22px rgba(15, 23, 42, 0.5);
}

.marketing-light.login-shell .auth-divider::before,
.marketing-light.login-shell .auth-divider::after {
  background: #e2e8f0;
}

.marketing-light.login-shell .auth-panel-switch {
  background: transparent;
  border: 0;
}

.marketing-light.login-shell .auth-panel-switch__item {
  color: #64748b !important;
}

.marketing-light.login-shell .auth-panel-switch__item:hover:not(:disabled) {
  color: #312e81 !important;
}

.marketing-light.login-shell .auth-panel-switch__item--active {
  color: #4338ca !important;
  background: #eef2ff;
  box-shadow: inset 0 0 0 1px #c7d2fe;
}

.marketing-light.login-shell .auth-input,
.marketing-light.login-shell .auth-field-shell {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #0f172a !important;
}

.marketing-light.login-shell .auth-input::placeholder,
.marketing-light.login-shell .auth-field-shell input::placeholder {
  color: #94a3b8 !important;
}

.marketing-light.login-shell .auth-input:focus,
.marketing-light.login-shell .auth-field-shell:focus-within {
  border-color: #818cf8 !important;
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.16);
}

.marketing-light.login-shell .auth-link-button,
.marketing-light.login-shell .auth-link {
  color: #4f46e5 !important;
  text-decoration-color: #c7d2fe;
}

.marketing-light.login-shell .auth-link-button:hover:not(:disabled),
.marketing-light.login-shell .auth-link:hover {
  color: #312e81 !important;
}

.marketing-light.login-shell .auth-inline-action {
  background: #eef2ff;
  color: #4338ca !important;
}

.marketing-light.login-shell .auth-inline-action:hover {
  background: #e0e7ff;
}

.marketing-light.login-shell .auth-action.ghost {
  background: #f8fafc;
  color: #475569 !important;
  border-color: #e2e8f0;
}

.marketing-light.login-shell .auth-status-pill {
  background: #ecfdf5;
  color: #047857 !important;
}

.marketing-light.login-shell .feature-pill {
  background: #ffffff;
  border-color: #e2e8f0 !important;
  box-shadow: 0 12px 28px -26px rgba(15, 23, 42, 0.5);
}

.marketing-light.login-shell .native-auth-banner {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
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

@media (max-width: 640px) {
  .login-shell {
    align-items: flex-start;
  }

  .login-card {
    padding: 1.25rem 1.1rem;
    border-radius: 1.5rem;
    gap: 0.95rem;
  }

  .login-header__title {
    font-size: 1.2rem;
  }

  .auth-panel-switch {
    padding: 0;
    margin-bottom: 0.75rem;
  }
}
</style>
