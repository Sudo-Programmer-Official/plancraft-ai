<template>
  <div class="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
    <div class="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl">
      <p class="text-sm uppercase tracking-[0.3em] text-indigo-300/80">{{ platformLabel }}</p>
      <h1 class="text-3xl font-semibold mt-3">Opening PlanCraftAI</h1>
      <p class="text-sm text-slate-300 mt-4">
        {{ helperText }}
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
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildNativeAuthAndroidIntentUrl,
  buildNativeAuthFallbackSchemeUrl,
  normalizeRedirectPath,
} from '@/services/mobileAuthHandoffService'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const code = computed(() => String(route.query.code || ''))
const redirectTarget = computed(() =>
  normalizeRedirectPath(String(route.query.redirect || '/dashboard')),
)
const platform = computed(() => {
  const requested = String(route.query.platform || '').trim().toLowerCase()
  if (requested === 'ios' || requested === 'android') return requested
  const ua = String(navigator.userAgent || '').toLowerCase()
  if (ua.includes('android')) return 'android'
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios'
  return 'ios'
})
const provider = computed(() => String(route.query.provider || '').trim().toLowerCase() || 'phone')
const platformLabel = computed(() =>
  platform.value === 'android' ? 'Android Sign-In' : 'iPhone Sign-In',
)
const helperText = computed(() =>
  platform.value === 'android'
    ? 'If the Android app does not reopen automatically, use the button below.'
    : 'If the iPhone app does not reopen automatically, tap the button below and keep this page open.',
)
const fallbackUrl = computed(() =>
  buildNativeAuthFallbackSchemeUrl({
    code: code.value,
    redirect: redirectTarget.value,
    platform: platform.value,
    provider: provider.value,
  }),
)
const androidIntentUrl = computed(() =>
  buildNativeAuthAndroidIntentUrl({
    code: code.value,
    redirect: redirectTarget.value,
    platform: platform.value,
    provider: provider.value,
  }),
)
const launchUrl = computed(() =>
  platform.value === 'android' ? androidIntentUrl.value : fallbackUrl.value,
)

let launchAttemptTimer = null
let retryLaunchTimer = null
let nativeConsumeTimer = null
let visibilityHandler = null
let pageHideHandler = null

function openApp() {
  if (!code.value) return
  window.location.assign(launchUrl.value)
}

function continueOnWeb() {
  router.replace(redirectTarget.value)
}

onMounted(() => {
  if (isNativePackagedApp()) {
    if (!code.value) {
      continueOnWeb()
      return
    }

    nativeConsumeTimer = window.setTimeout(async () => {
      if (router.currentRoute.value.name !== 'native-auth-complete') return
      try {
        const result = await authStore.completeNativeAuthHandoff(code.value, redirectTarget.value)
        await router.replace(result?.redirect || redirectTarget.value)
      } catch (error) {
        console.error('[NativeAuthComplete] Native consume fallback failed', {
          platform: platform.value,
          provider: provider.value,
          message: error?.message || String(error),
        })
        await router.replace('/login')
      }
    }, 450)
    return
  }

  let appLaunchDetected = false

  visibilityHandler = () => {
    appLaunchDetected = document.visibilityState === 'hidden'
  }

  pageHideHandler = () => {
    appLaunchDetected = true
  }

  document.addEventListener('visibilitychange', visibilityHandler)
  window.addEventListener('pagehide', pageHideHandler, { once: true })

  if (code.value) {
    launchAttemptTimer = window.setTimeout(() => {
      if (appLaunchDetected) return
      openApp()
    }, 120)

    retryLaunchTimer = window.setTimeout(() => {
      if (appLaunchDetected) return
      window.location.assign(fallbackUrl.value)
    }, platform.value === 'android' ? 900 : 1100)
  }
})

onBeforeUnmount(() => {
  if (launchAttemptTimer) {
    clearTimeout(launchAttemptTimer)
    launchAttemptTimer = null
  }
  if (retryLaunchTimer) {
    clearTimeout(retryLaunchTimer)
    retryLaunchTimer = null
  }
  if (nativeConsumeTimer) {
    clearTimeout(nativeConsumeTimer)
    nativeConsumeTimer = null
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
  if (pageHideHandler) {
    window.removeEventListener('pagehide', pageHideHandler)
    pageHideHandler = null
  }
})
</script>
