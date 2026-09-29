<template>
  <div class="marketing-light min-h-screen bg-slate-950 text-slate-900 flex items-center justify-center px-4">
    <div class="max-w-md w-full space-y-4 text-center">
      <h1 class="text-2xl font-semibold">Linking PlanCraft AI</h1>
      <p class="text-sm text-slate-300" v-if="!error">
        {{ statusMessage }}
      </p>
      <p class="text-sm text-red-300" v-else>
        {{ error }}
      </p>
      <div class="flex justify-center" v-if="!error">
        <svg class="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      </div>
      <div v-if="error" class="space-y-3">
        <button class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500" @click="retry">
          Try again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { createGptLinkCode } from '@/services/gptService'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const statusMessage = ref('Verifying your session…')
const error = ref('')
const expectedClientId = import.meta.env.VITE_GPT_CLIENT_ID || 'plancraft-gpt-client'

function appendParams(base, params = {}) {
  try {
    const url = new URL(base)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length) {
        url.searchParams.set(key, value)
      }
    })
    return url.toString()
  } catch {
    return null
  }
}

async function ensureSignedIn() {
  if (authStore?.user?.uid) return authStore.user
  const current = window.location.pathname + window.location.search
  await router.push({ path: '/login', query: { redirect: current } })
  throw new Error('redirecting')
}

async function startLink() {
  try {
    const clientId = route.query.client_id || route.query.clientId
    const redirectUri = route.query.redirect_uri || route.query.redirectUri
    const state = route.query.state || ''
    if (!clientId || clientId !== expectedClientId) {
      throw new Error('Invalid client id')
    }
    if (!redirectUri || !/^https:\/\/chat\.openai\.com\//.test(String(redirectUri))) {
      throw new Error('Invalid redirect URL')
    }
    await ensureSignedIn()
    statusMessage.value = 'Generating secure link code…'
    const result = await createGptLinkCode(authStore.user.uid)
    if (!result?.code) throw new Error('Failed to generate code')
    statusMessage.value = 'Redirecting back to ChatGPT…'
    const finalUrl = appendParams(redirectUri, { code: result.code, state })
    if (!finalUrl) throw new Error('Redirect URL malformed')
    window.location.replace(finalUrl)
  } catch (err) {
    if (String(err?.message || '').toLowerCase() === 'redirecting') return
    console.error('[GptOAuth] link failed', err)
    error.value = err?.message || 'Unable to complete linking.'
  }
}

function retry() {
  error.value = ''
  statusMessage.value = 'Retrying…'
  startLink()
}

onMounted(() => {
  startLink()
})
</script>
