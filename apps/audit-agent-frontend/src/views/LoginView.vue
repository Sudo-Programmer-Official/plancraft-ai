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

<div class="mt-10 space-y-4">
            <div class="space-y-3">
              <button
                @click="loginGoogle"
                :disabled="authStore.loading || (isNativeApp && !canUseNativeGoogle)"
                class="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-4 rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-70"
              >
                <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" class="w-5 h-5" />
                Continue with Google
              </button>
              <button
                v-if="isIosApp"
                @click="loginApple"
                :disabled="authStore.loading || isNativeApp"
                class="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-4 rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-70"
              >
                <img src="https://www.svgrepo.com/show/303128/apple-logo.svg" alt="Apple" class="w-5 h-5" />
                Continue with Apple
              </button>
              <button
                type="button"
                :disabled="authStore.loading"
                class="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold border border-white/10 text-white hover:border-indigo-300/70 hover:bg-white/5 transition disabled:opacity-70"
                @click="toggleEmail"
              >
                ✉️ Continue with Email
              </button>
              <button
                type="button"
                :disabled="authStore.loading || isNativeApp"
                class="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold border border-white/10 text-white hover:border-indigo-300/70 hover:bg-white/5 transition disabled:opacity-70"
                @click="togglePhone(true)"
              >
                📱 Continue with Phone (OTP)
              </button>
            </div>

            <p class="text-center text-sm text-indigo-200/80">Choose how you want to sign in. No spam. No passwords.</p>
            <p v-if="isNativeApp" class="native-auth-banner">
              {{ nativeAuthBanner }}
            </p>

            <div v-if="showEmail" class="auth-panel">
              <h2 class="text-lg font-semibold text-white mb-3">Email access</h2>
              <div class="space-y-3">
                <input v-model="email" type="email" placeholder="Email" class="auth-input" />
                <input v-model="password" type="password" placeholder="Password" class="auth-input" />
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-sm">
                  <button @click="onLoginEmail" :disabled="authStore.loading" class="auth-action primary">
                    Sign In
                  </button>
                  <button @click="onRegister" :disabled="authStore.loading" class="auth-action ghost">
                    Create account
                  </button>
                </div>
                <button @click="onReset" class="text-xs text-indigo-300 hover:text-indigo-200 transition text-left">
                  Forgot password?
                </button>
                <div v-if="!isNativeApp" class="pt-3 border-t border-white/10">
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

            <div v-if="showPhone" class="auth-panel">
              <h2 class="text-lg font-semibold text-white mb-3">Phone OTP</h2>
              <div class="space-y-3">
                <div
                  class="flex items-center gap-3 bg-[#1e1b2e] border border-white/10 rounded-xl px-3 py-2"
                  @click="focusPhoneField"
                  @touchstart.passive="focusPhoneField"
                >
                  <span class="text-2xl select-none" aria-label="Detected country flag">{{ detectedFlag }}</span>
                  <input
                    ref="phoneFieldRef"
                    v-model="phoneInput"
                    type="tel"
                    placeholder="Enter phone e.g. +1 650 555 1234"
                    class="flex-1 bg-transparent text-white placeholder:text-indigo-200/60 focus:outline-none text-base py-2"
                    inputmode="tel"
                    autocomplete="tel"
                    enterkeyhint="send"
                    @input="onPhoneInput"
                  />
                </div>
                <p class="text-xs text-indigo-200/70">{{ phoneHint }}</p>
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

          <p v-if="authStore.loading" class="text-sm text-gray-300 mt-6 text-center">✨ Preparing your space...</p>
          <GoogleAuthDiagnostic class="mt-6" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/authStore"
import LoginFeatureSlider from '@/components/LoginFeatureSlider.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { Capacitor } from '@capacitor/core'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
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
import GoogleAuthDiagnostic from '@/components/GoogleAuthDiagnostic.vue'
import {
  isNativePackagedApp,
  getNativeAuthRestriction,
  supportsNativeGoogleRedirectBridge,
} from '@/utils/nativeAuthSupport'

const isNativeApp = computed(() => isNativePackagedApp())
const canUseNativeGoogle = computed(() => supportsNativeGoogleRedirectBridge())
const nativeAuthBanner = computed(() => {
  if (!isNativeApp.value) return ''
  if (canUseNativeGoogle.value) {
    return 'Android Google sign-in now returns to the app through the browser handoff bridge. Apple, phone OTP, and magic link still need additional native wiring.'
  }
  return 'This mobile app build is currently hardened to use email/password only. Google, Apple, phone OTP, and magic link still need native auth wiring and deep-link return handling.'
})

async function loginGoogle() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  try {
    await authStore.loginWithGoogle()
    if (authStore.user) redirectAfterLogin()
  } catch (err) {
    console.warn('Google login failed; offering OTP fallback', err)
    if (err?.code === 'auth/native-google-unsupported') {
      try { ElMessage.info(getNativeAuthRestriction('google')) } catch {}
      showEmail.value = true
      return
    }
    if (err?.code === 'auth/native-google-link-unsupported') {
      try { ElMessage.info('Google account linking from inside the Android app is not available yet. Sign in directly instead.') } catch {}
      return
    }
    showPhone.value = true
    try { ElMessage.info('Google sign-in unavailable. Try phone OTP.') } catch {}
  }
}

async function loginApple() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  try {
    await authStore.loginWithApple()
    if (authStore.user) redirectAfterLogin()
  } catch (err) {
    console.warn('Apple login failed', err)
    if (err?.code === 'auth/native-apple-unsupported') {
      try { ElMessage.info(getNativeAuthRestriction('apple')) } catch {}
      showEmail.value = true
      return
    }
    try { ElMessage.info('Apple sign-in unavailable. Try another method.') } catch {}
  }
}

// Email auth
const showEmail = ref(false)
const email = ref('')
const password = ref('')
const magicSent = ref(false)

async function onLoginEmail() {
  try {
    try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
    await authStore.loginWithEmail(email.value, password.value)
    if (authStore.user) redirectAfterLogin()
  } catch (e) {
    alert('Login failed. Please check your credentials.')
  }
}

async function onRegister() {
  try {
    try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
    await authStore.registerEmail(email.value, password.value)
    if (authStore.user) redirectAfterLogin()
  } catch (e) {
    alert('Sign up failed. Try a different email.')
  }
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
const showPhone = ref(false)
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

async function ensureRecaptcha(force = false) {
  try {
    const container = document.getElementById('recaptcha-container')
    if (!container) return null

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

function togglePhone() {
  if (isNativeApp.value) {
    ElMessage.info(getNativeAuthRestriction('phone'))
    return
  }
  showPhone.value = !showPhone.value
  if (showPhone.value) {
    setTimeout(() => ensureRecaptcha(), 0)
    nextTick(() => focusPhoneField())
  } else {
    resetRecaptcha()
  }
}

function toggleEmail() {
  showEmail.value = !showEmail.value
}

function sanitizePhone() {
  phoneInput.value = phoneInput.value.replace(/[^\d]/g, '')
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
    console.error('[OTP] send failed', error)
    if (error?.code === 'auth/native-phone-unsupported') {
      ElMessage.info(getNativeAuthRestriction('phone'))
      showEmail.value = true
      return
    }
    resetRecaptcha()
    const msg = IS_LOCAL
      ? 'OTP send failed on localhost. Use a Firebase test number (e.g., +13614429376 code 123456) or try email/Google.'
      : 'Failed to send OTP. Please check your number and try again.'
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

function redirectAfterLogin() {
  const nextParam = typeof route?.query?.next === 'string' && route.query.next.length ? route.query.next : null
  try {
    // Priority 1: stored intent
    const stored = localStorage.getItem('postLoginRedirect')
    if (stored) {
      localStorage.removeItem('postLoginRedirect')
      return router.push(stored)
    }
  } catch {}
  if (nextParam) return router.push(nextParam)
  // Priority 2: redirect query from guard
  const q = route?.query?.redirect
  if (typeof q === 'string' && q.length) return router.push(q)
  // Default: team onboarding
  router.push('/workspaces/new')
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
    showEmail.value = true
  }
})

// Handle magic-link return
onMounted(async () => {
  try {
    const user = await completeMagicLinkSignIn(window.location.href)
    if (user) redirectAfterLogin()
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

.login-card {
  position: relative;
  z-index: 1;
}

.value-props {
  animation: fade-in 1s ease forwards;
}

.auth-panel {
  margin-top: 1rem;
  padding: 1.25rem;
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

.auth-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
}

.auth-input::placeholder {
  color: rgba(226, 232, 240, 0.65);
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

@media (max-width: 640px) {
  .auth-panel {
    padding: 1rem;
  }
}
</style>
