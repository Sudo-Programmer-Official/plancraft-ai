<template>
  <div class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900">
    <!-- Background animation -->
    <div class="absolute inset-0">
      <canvas ref="starsCanvas" class="w-full h-full"></canvas>
    </div>

    <!-- Login card -->
    <div class="relative z-10 bg-gray-900/60 backdrop-blur-lg rounded-2xl shadow-2xl p-10 w-full max-w-md text-center animate-fade-in">
      <h1 class="text-3xl font-bold text-white mb-4">🌙 PlanCraftAI</h1>
      <p class="text-gray-300 mb-8">Your AI-powered productivity companion</p>

      <!-- Off-screen reCAPTCHA anchor (must be mounted in DOM) -->
      <div id="recaptcha-container" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;"></div>

      <!-- Login Buttons -->
      <div class="space-y-4">
        <button
          @click="loginGoogle"
          :disabled="authStore.loading"
          class="w-full flex items-center justify-center gap-3 bg-white text-gray-800 px-5 py-3 rounded-xl font-medium shadow hover:shadow-lg transition"
        >
          <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" class="w-5 h-5" />
          Continue with Google
        </button>

        <button
          @click="loginGuest"
          :disabled="authStore.loading"
          class="w-full bg-indigo-600 text-white px-5 py-3 rounded-xl font-medium shadow hover:bg-indigo-700 transition"
        >
          Continue as Guest
        </button>
        
        <!-- Email Login -->
        <div class="pt-2 text-left">
          <button
            class="text-indigo-300 text-sm hover:text-indigo-200"
            @click="showEmail = !showEmail"
          >
            {{ showEmail ? 'Hide' : 'Prefer email? Sign in with email' }}
          </button>
          <div v-if="showEmail" class="mt-3 space-y-3">
            <input v-model="email" type="email" placeholder="Email" class="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400" />
            <input v-model="password" type="password" placeholder="Password" class="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400" />
            <div class="flex items-center justify-between text-sm">
              <button @click="onLoginEmail" :disabled="authStore.loading" class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition">
                Sign In
              </button>
              <button @click="onRegister" :disabled="authStore.loading" class="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
                Create account
              </button>
            </div>
            <button @click="onReset" class="text-xs text-indigo-300 hover:text-indigo-200">Forgot password?</button>
            <div class="pt-3 border-t border-gray-800">
              <div class="flex items-center justify-between text-sm">
                <span class="text-indigo-200">Or get a magic link</span>
                <button @click="onSendMagic" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition">Send Link</button>
              </div>
              <p v-if="magicSent" class="text-xs text-green-300 mt-2">Magic link sent! Check your email.</p>
            </div>
          </div>
        </div>
        
        <!-- Phone OTP Login -->
        <div class="pt-4 text-left">
          <button
            class="text-indigo-300 text-sm hover:text-indigo-200"
            @click="togglePhone()"
          >
            {{ showPhone ? 'Hide' : 'Prefer phone? Sign in with OTP' }}
          </button>
          <div v-if="showPhone" class="mt-3 space-y-3">
            <input
              v-model="phone"
              type="tel"
              placeholder="+1 234 567 8901"
              class="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400"
            />
            <div v-if="!otpSent">
              <button
                @click="sendOtp"
                :disabled="sendingOtp || !phone"
                class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition disabled:opacity-60"
              >
                {{ sendingOtp ? 'Sending…' : 'Send OTP' }}
              </button>
            </div>
            <div v-else class="space-y-2">
              <input
                v-model="otp"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="Enter OTP"
                class="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400"
              />
              <button
                @click="verifyOtp"
                :disabled="verifyingOtp || !otp"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition disabled:opacity-60"
              >
                {{ verifyingOtp ? 'Verifying…' : 'Verify & Sign In' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="authStore.loading" class="text-sm text-gray-400 mt-6">✨ Preparing your space...</p>
      <!-- Dev-only diagnostics -->
      <GoogleAuthDiagnostic />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/authStore"

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const starsCanvas = ref(null)

import { trackLinkedInConversion } from '@/utils/ads'
import { RecaptchaVerifier } from 'firebase/auth'
import { auth } from '@/firebase/init'
import { ElMessage } from 'element-plus'
import { normalizePhone, guessCountryFromLocale } from '@/utils/phoneUtils'
import { sendMagicLink, completeMagicLinkSignIn } from '@/services/authService'
import GoogleAuthDiagnostic from '@/components/GoogleAuthDiagnostic.vue'
async function loginGoogle() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  try {
    await authStore.loginWithGoogle()
    if (authStore.user) redirectAfterLogin()
  } catch (err) {
    console.warn('Google login failed; offering OTP fallback', err)
    showPhone.value = true
    try { ElMessage.info('Google sign-in unavailable. Try phone OTP.') } catch {}
  }
}

async function loginGuest() {
  await authStore.loginAsGuest()
  if (authStore.user) redirectAfterLogin()
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
const phone = ref('')
const otp = ref('')
const otpSent = ref(false)
const sendingOtp = ref(false)
const verifyingOtp = ref(false)
let confirmationResult = null

async function ensureRecaptcha(force = false) {
  try {
    const container = document.getElementById('recaptcha-container')
    if (!container) return null

    let v = window.recaptchaVerifier
    const needsNew = force || !v
    if (needsNew) {
      try { v?.clear?.() } catch {}
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
  showPhone.value = !showPhone.value
  if (showPhone.value) {
    setTimeout(() => ensureRecaptcha(), 0)
  }
}

async function sendOtp() {
  if (!phone.value) return ElMessage.error('Please enter a phone number.')
  try {
    sendingOtp.value = true
    let verifier = await ensureRecaptcha()
    if (!verifier) throw new Error('reCAPTCHA not ready. Please try again.')
    // Normalize to E.164 before sending
    const cc = guessCountryFromLocale()
    const formatted = normalizePhone(phone.value, cc)
    if (!/^\+[1-9]\d{6,14}$/.test(formatted)) {
      throw new Error('Invalid phone format. Use full number incl. country code.')
    }
    phone.value = formatted
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
    ElMessage.success('OTP sent successfully!')
  } catch (error) {
    console.error('[OTP] send failed', error)
    ElMessage.error('Failed to send OTP. Please check your number and try again.')
  } finally {
    sendingOtp.value = false
  }
}

async function verifyOtp() {
  if (!otp.value) return alert('Enter the OTP you received.')
  try {
    verifyingOtp.value = true
    await authStore.confirmPhoneOtp(confirmationResult, otp.value)
    redirectAfterLogin()
  } catch (error) {
    console.error('[OTP] verify failed', error)
    ElMessage.error('Invalid OTP. Please try again.')
  } finally {
    verifyingOtp.value = false
  }
}

function redirectAfterLogin() {
  try {
    // Priority 1: stored intent
    const stored = localStorage.getItem('postLoginRedirect')
    if (stored) {
      localStorage.removeItem('postLoginRedirect')
      return router.push(stored)
    }
  } catch {}
  // Priority 2: redirect query from guard
  const q = route?.query?.redirect
  if (typeof q === 'string' && q.length) return router.push(q)
  // Default: dashboard
  router.push('/dashboard')
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
  animation: fade-in 1s ease forwards;
}
</style>
