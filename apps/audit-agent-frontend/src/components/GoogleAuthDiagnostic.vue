<template>
  <div v-if="enabled" class="mt-6 bg-white/5 border border-white/10 rounded-xl p-4 text-left">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-indigo-200">Google Sign‑in Diagnostics</h3>
      <span class="text-[11px] text-slate-400">Dev‑only</span>
    </div>
    <p class="text-xs text-slate-300 mb-3">Runs local checks and prints probable causes for popup/redirect failures.</p>

    <div class="flex flex-wrap gap-2 mb-3">
      <el-button size="small" @click="runChecks">Run Checks</el-button>
      <el-button size="small" @click="testPopup">Test Popup</el-button>
      <el-button size="small" type="warning" @click="testRedirect">Test Redirect</el-button>
    </div>

    <pre class="text-xs whitespace-pre-wrap bg-black/30 rounded p-3 max-h-64 overflow-auto">
{{ JSON.stringify(results, null, 2) }}
    </pre>

    <p v-if="results?.suggestion" class="mt-2 text-xs text-yellow-300">Suggestion: {{ results.suggestion }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth } from '@/firebase/init'

const enabled = (import.meta.env.VITE_ENABLE_AUTH_DIAG === '1')
const results = ref({})

function getUAInfo() {
  const ua = navigator.userAgent || ''
  const isIOS = /iP(hone|ad|od)/i.test(ua)
  const isChrome = /Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/CriOS/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Edg/i.test(ua)
  const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone
  const isInApp = /(instagram|fbav|facebook|line|wechat|micromessenger|pinterest|snapchat|tiktok|linkedin)/i.test(ua)
  return { isIOS, isSafari, isChrome, isStandalone, isInApp }
}

function popupPossible() {
  try {
    const w = window.open('', '_blank', 'width=200,height=100')
    if (!w || w.closed) return false
    try { w.close() } catch {}
    return true
  } catch {
    return false
  }
}

async function runChecks() {
  const ua = getUAInfo()
  const isNative = Capacitor.isNativePlatform?.() || false
  const platform = Capacitor.getPlatform?.() || 'web'
  const origin = window.location.origin
  const referrer = document.referrer
  const env = {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  }
  const effective = {
    authDomain: (auth && auth.app && auth.app.options && auth.app.options.authDomain) || null,
  }
  const shouldRedirect = isNative || ua.isStandalone || (ua.isIOS && ua.isSafari) || ua.isInApp
  const canPopup = popupPossible()
  const suggestion = shouldRedirect ? 'Native/redirect flow required on this device' : (canPopup ? 'Popup should work; check Authorized domains' : 'Popup blocked; try redirect')
  results.value = {
    ua,
    native: { isNative, platform },
    origin,
    referrer,
    env,
    effective,
    canPopup,
    shouldRedirect,
    suggestion,
  }
}

async function testPopup() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(getAuth(), provider)
    results.value = { ...results.value, popup: { ok: true } }
  } catch (e) {
    results.value = { ...results.value, popup: { ok: false, code: e?.code, message: e?.message } }
  }
}

async function testRedirect() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    console.log('[AuthDiag] redirect authDomain:', auth?.app?.options?.authDomain)
    console.log('[AuthDiag] redirect URL:', `https://${auth?.app?.options?.authDomain || ''}/__/auth/handler`)
    results.value = { ...results.value, redirect: { starting: true } }
    await signInWithRedirect(auth, provider)
  } catch (e) {
    results.value = { ...results.value, redirect: { ok: false, code: e?.code, message: e?.message } }
  }
}
</script>

<style scoped>
</style>
