<template>
  <div class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900">
    <!-- Background animation -->
    <div class="absolute inset-0">
      <canvas ref="starsCanvas" class="w-full h-full"></canvas>
    </div>

    <!-- Login card -->
    <div class="relative z-10 bg-gray-900/60 backdrop-blur-lg rounded-2xl shadow-2xl p-10 w-full max-w-md text-center animate-fade-in">
      <h1 class="text-3xl font-bold text-white mb-4">🌙 AuditAgent</h1>
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
      </div>

      <p v-if="authStore.loading" class="text-sm text-gray-400 mt-6">✨ Preparing your space...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/authStore"

const router = useRouter()
const authStore = useAuthStore()
const starsCanvas = ref(null)

async function loginGoogle() {
  await authStore.loginWithGoogle()
  if (authStore.user) router.push("/dashboard")
}

async function loginGuest() {
  await authStore.loginAsGuest()
  if (authStore.user) router.push("/morning")
}
// --- Star animation ---
onMounted(() => {
  const canvas = starsCanvas.value
  const ctx = canvas.getContext("2d")

  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  window.addEventListener("resize", resize)
  resize()

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