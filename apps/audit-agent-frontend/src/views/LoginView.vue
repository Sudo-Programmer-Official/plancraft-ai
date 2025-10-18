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
          </div>
        </div>
      </div>

      <p v-if="authStore.loading" class="text-sm text-gray-400 mt-6">✨ Preparing your space...</p>
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
async function loginGoogle() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  await authStore.loginWithGoogle()
  if (authStore.user) redirectAfterLogin()
}

async function loginGuest() {
  await authStore.loginAsGuest()
  if (authStore.user) redirectAfterLogin()
}

// Email auth
const showEmail = ref(false)
const email = ref('')
const password = ref('')

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
  if (!email.value) return alert('Enter your email above to reset')
  try {
    await authStore.resetPassword(email.value)
    alert('Password reset email sent. Check your inbox.')
  } catch (e) {
    alert('Failed to send reset email.')
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
