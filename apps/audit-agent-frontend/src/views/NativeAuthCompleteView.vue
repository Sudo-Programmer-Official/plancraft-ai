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
  buildNativeAuthAndroidIntentUrl,
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
const androidIntentUrl = computed(() =>
  buildNativeAuthAndroidIntentUrl({
    code: code.value,
    redirect: redirectTarget.value,
  }),
)

function openApp() {
  if (!code.value) return
  const ua = String(navigator.userAgent || '').toLowerCase()
  const isAndroid = ua.includes('android')
  window.location.assign(isAndroid ? androidIntentUrl.value : fallbackUrl.value)
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
  let appLaunchDetected = false

  const markAppLaunch = () => {
    appLaunchDetected = document.visibilityState === 'hidden'
  }

  document.addEventListener('visibilitychange', markAppLaunch)
  window.addEventListener('pagehide', () => {
    appLaunchDetected = true
  }, { once: true })

  if (isAndroid && code.value) {
    window.setTimeout(() => {
      if (appLaunchDetected) return
      window.location.assign(androidIntentUrl.value)
    }, 120)
    window.setTimeout(() => {
      if (appLaunchDetected) return
      window.location.assign(fallbackUrl.value)
    }, 900)
  }

  window.setTimeout(() => {
    if (appLaunchDetected) return
    continueOnWeb()
  }, 3200)
})
</script>
