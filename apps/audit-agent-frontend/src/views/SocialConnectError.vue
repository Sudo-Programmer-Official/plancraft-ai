<template>
  <div class="marketing-light min-h-screen flex items-center justify-center bg-slate-950 text-slate-900 p-6">
    <div class="max-w-md w-full space-y-4 bg-slate-900/70 border border-white/10 rounded-xl p-6 shadow-xl">
      <div class="text-3xl">⚠️ LinkedIn connection failed</div>
      <p class="text-slate-200 text-sm">
        We could not complete the LinkedIn connection. Please try again.
      </p>
      <p v-if="error" class="text-xs text-red-300 break-words">Error: {{ error }}</p>
      <button
        class="w-full px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm text-white"
        @click="goHome"
      >
        Back to app
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const error = computed(() => route.query?.error || '')

function goHome() {
  router.push({ name: 'settings' }).catch(() => {})
}
</script>
