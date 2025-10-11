<template>
  <div
    v-if="isGuest && !dismissed"
    class="bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 
           px-5 py-4 rounded-xl shadow-md mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
  >
    <div class="flex items-start sm:items-center gap-2">
      <span class="text-lg mr-2">⚠️</span>
      <span class="text-sm sm:text-base">
        <strong>Guest Mode</strong> — your data is only stored on this device. <br class="sm:hidden" />
        <span class="text-yellow-300">Log in to secure it with private cloud sync.</span>
      </span>
    </div>

    <div class="flex gap-2 sm:ml-4 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 justify-start sm:justify-end">
      <button
        @click="handleLogin"
        class="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md text-white text-sm font-semibold"
      >
        Log In
      </button>
      <button
        @click="dismissed = true"
        class="text-xs text-gray-400 hover:text-gray-200"
      >
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps({
  isGuest: Boolean
})

const authStore = useAuthStore()
const dismissed = ref(false)

async function handleLogin() {
  try {
    await authStore.loginWithGoogle()
  } catch (err) {
    console.error('[GuestBanner] Login error:', err)
  }
}
</script>