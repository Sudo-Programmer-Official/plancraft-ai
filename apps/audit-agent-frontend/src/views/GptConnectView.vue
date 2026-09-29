<template>
  <div class="marketing-light min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-900 px-4 py-12">
    <div class="max-w-3xl mx-auto space-y-10 text-center">
      <div>
        <p class="text-xs uppercase tracking-[0.4em] text-indigo-300 mb-3">PlanCraft GPT</p>
        <h1 class="text-3xl sm:text-4xl font-bold">Link your account to ChatGPT</h1>
        <p class="text-slate-300 mt-4">
          ChatGPT needs a short-lived code generated inside your PlanCraft settings. Follow the steps below,
          then paste the code back in the PlanCraft GPT to complete the connection.
        </p>
      </div>

      <div
        v-if="isLoggedIn"
        class="bg-white/10 border border-white/10 rounded-2xl p-6 space-y-3 shadow-2xl"
      >
        <h2 class="text-xl font-semibold flex items-center gap-2 justify-center">
          <span class="text-2xl">✅</span>
          Signed in as {{ authStore.user?.displayName || authStore.user?.email || 'PlanCraft member' }}
        </h2>
        <p class="text-sm text-slate-300">
          We’ll open your Settings → Integrations panel so you can generate a GPT link code.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition disabled:opacity-60"
            :disabled="redirecting"
            @click="openSettings"
          >
            {{ redirecting ? 'Opening Settings…' : 'Open Settings' }}
          </button>
          <button
            class="px-5 py-3 rounded-xl border border-white/20 hover:border-white/40 transition"
            @click="copyHelpUrl"
          >
            Copy instructions link
          </button>
        </div>
      </div>

      <div
        v-else
        class="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3 shadow-2xl"
      >
        <h2 class="text-xl font-semibold flex items-center gap-2 justify-center">
          <span class="text-2xl">🔐</span>
          You need to sign in first
        </h2>
        <p class="text-sm text-slate-300">
          Use your PlanCraft login so we can generate a secure code linked to your account.
        </p>
        <button
          class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition"
          @click="goToLogin"
        >
          Sign in to continue
        </button>
      </div>

      <div class="bg-slate-900/60 border border-white/5 rounded-2xl p-6 text-left space-y-4">
        <h3 class="text-lg font-semibold text-indigo-200">Steps</h3>
        <ol class="list-decimal list-inside space-y-3 text-slate-300">
          <li>Open Settings → Integrations in PlanCraft.</li>
          <li>Press <strong>Generate Code</strong> inside the PlanCraft GPT card.</li>
          <li>Copy the code and paste it into the PlanCraft GPT in ChatGPT.</li>
          <li>ChatGPT will exchange it for a secure token and sync your data.</li>
        </ol>
        <p class="text-xs text-slate-500">
          Each code expires after a few minutes. You can generate a new one anytime.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const redirecting = ref(false)

const isLoggedIn = computed(() => !!authStore?.user?.uid)
const settingsQuery = { tab: 'integrations', gpt: '1' }

function openSettings() {
  redirecting.value = true
  router.push({ name: 'settings', query: settingsQuery }).finally(() => {
    redirecting.value = false
  })
}

function goToLogin() {
  router.push({ path: '/login', query: { redirect: '/settings?tab=integrations&gpt=1' } })
}

async function copyHelpUrl() {
  const url = `${window.location.origin}/integrations/gpt`
  try {
    await navigator.clipboard.writeText(url)
  } catch {}
}

onMounted(() => {
  if (isLoggedIn.value) {
    setTimeout(() => {
      if (!redirecting.value) openSettings()
    }, 1200)
  }
})
</script>
