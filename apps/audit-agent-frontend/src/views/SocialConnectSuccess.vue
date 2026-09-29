<template>
  <div class="marketing-light min-h-screen flex items-center justify-center bg-slate-950 text-slate-900 p-6">
    <div class="max-w-md w-full space-y-4 bg-slate-900/70 border border-white/10 rounded-xl p-6 shadow-xl">
      <div class="text-3xl">✅ LinkedIn connected</div>
      <p class="text-slate-200 text-sm">
        You can close this tab and return to PlanCraft. Your LinkedIn account is now linked.
      </p>
      <button
        class="w-full px-4 py-2 rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm"
        @click="goHome"
      >
        Back to app
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
function goHome() {
  router.push({ name: 'settings' }).catch(() => {})
}
</script>
