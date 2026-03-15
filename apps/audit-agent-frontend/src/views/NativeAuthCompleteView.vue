<template>
  <div class="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
    <div class="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl">
      <p class="text-sm uppercase tracking-[0.3em] text-indigo-300/80">Android Sign-In</p>
      <h1 class="text-3xl font-semibold mt-3">Opening PlanCraftAI</h1>
      <p class="text-sm text-slate-300 mt-4">
        If the Android app does not reopen automatically, use the button below.
      </p>

      <div class="mt-8 space-y-3">
        <button
          type="button"
          class="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 transition px-4 py-3 font-semibold"
          @click="openApp"
        >
          Open App
        </button>
        <button
          type="button"
          class="w-full rounded-xl border border-white/10 px-4 py-3 font-semibold text-slate-200 hover:bg-white/5 transition"
          @click="continueOnWeb"
        >
          Continue On Web
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildNativeAuthFallbackSchemeUrl,
  normalizeRedirectPath,
} from '@/services/mobileAuthHandoffService'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

const route = useRoute()
const router = useRouter()

const code = computed(() => String(route.query.code || ''))
const redirectTarget = computed(() =>
  normalizeRedirectPath(String(route.query.redirect || '/dashboard')),
)
const fallbackUrl = computed(() =>
  buildNativeAuthFallbackSchemeUrl({
    code: code.value,
    redirect: redirectTarget.value,
  }),
)

function openApp() {
  if (!code.value) return
  window.location.assign(fallbackUrl.value)
}

function continueOnWeb() {
  router.replace(redirectTarget.value)
}

onMounted(() => {
  if (isNativePackagedApp()) {
    continueOnWeb()
    return
  }

  const ua = String(navigator.userAgent || '').toLowerCase()
  const isAndroid = ua.includes('android')
  if (isAndroid && code.value) {
    window.setTimeout(() => {
      openApp()
    }, 180)
  }

  window.setTimeout(() => {
    continueOnWeb()
  }, 1800)
})
</script>
