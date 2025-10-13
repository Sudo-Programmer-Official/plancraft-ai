<!-- <script setup>
import { RouterLink, RouterView } from 'vue-router'
import QuoteCard from '@components/QuoteCard.vue'
import { buildPrompt } from '@llm/promptBuilder'

// Optional: use buildPrompt just to verify it's working
const examplePrompt = buildPrompt('Build an AI app for food delivery')
</script>

<template>
  <header class="flex flex-col items-center justify-center py-8">
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="100" height="100" />
    <h1 class="text-2xl font-semibold text-purple-700 mt-4">Welcome to Prompt2Quote</h1>
    <QuoteCard title="MVP Stack" :description="examplePrompt" class="mt-6" />

    <nav class="mt-8 text-sm space-x-4">
      <RouterLink to="/" class="text-purple-600 hover:underline">Home</RouterLink>
      <RouterLink to="/about" class="text-purple-600 hover:underline">About</RouterLink>
    </nav>
  </header>

  <main class="p-4">
    <RouterView />
  </main>
</template>

<style scoped>
.logo {
  display: block;
  margin: 0 auto;
}
</style> -->

<template>
  <div v-if="authStore.loading" class="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white">
    <div class="text-center animate-pulse">
      <div class="text-2xl">🌙 PlanCraftAI</div>
      <p class="text-sm opacity-80 mt-2">Restoring your session...</p>
    </div>
  </div>
  <transition name="page-fade" mode="out-in" v-else>
    <RouterView />
  </transition>
  <InstallPrompt />
  <ConfettiOverlay v-if="confettiVisible" @done="confettiVisible = false" />

</template>

<script setup>
import InstallPrompt from "@/components/InstallPrompt.vue"
import { useAuthStore } from '@/stores/authStore'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ConfettiOverlay from '@/components/ConfettiOverlay.vue'
import { ElNotification } from 'element-plus'

const authStore = useAuthStore()

const confettiVisible = ref(false)

function triggerConfetti(count) {
  confettiVisible.value = true
  try {
    window.dispatchEvent(new Event('confetti:launch'))
  } catch {}
  try {
    ElNotification({
      title: 'Streak up! 🔥',
      message: `You\'re on a ${count}-day streak. Keep going!`,
      type: 'success',
      duration: 2600,
      offset: 80,
    })
  } catch {}
}

let streakHandler = null
onMounted(() => {
  streakHandler = (e) => {
    const count = e?.detail?.count || 1
    triggerConfetti(count)
  }
  window.addEventListener('streak-increased', streakHandler)
})

onBeforeUnmount(() => {
  try { if (streakHandler) window.removeEventListener('streak-increased', streakHandler) } catch {}
})
</script>

<style>
.page-fade-enter-active, .page-fade-leave-active {
  transition: opacity 0.4s ease, filter 0.4s ease;
}
.page-fade-enter-from, .page-fade-leave-to {
  opacity: 0;
  filter: blur(3px);
}
</style>
