<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="iabh-title"
      aria-describedby="iabh-desc"
      class="max-w-sm w-[90%] rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-900 shadow-2xl space-y-5 outline-none"
      tabindex="0"
    >
      <div class="text-4xl">🌿</div>
      <h2 id="iabh-title" class="text-xl font-semibold">Open in your browser</h2>
      <p id="iabh-desc" class="text-sm leading-relaxed text-slate-600">
        For the best and most secure sign-in experience, please open this page in
        <strong>Safari</strong> or <strong>Chrome</strong>.  
        Some in-app browsers (like LinkedIn or Instagram) don’t fully support Google login.
      </p>

      <div class="text-xs text-slate-500">
        Tip: Tap the <strong>•••</strong> menu → <em>Open in Browser</em>.
      </div>

      <div class="flex flex-col items-center gap-3 pt-2">
        <a
          v-if="chromeIntentUrl"
          :href="chromeIntentUrl"
          class="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm w-full transition-all"
        >
          Open in Chrome
        </a>
        <button
          type="button"
          @click="copyLink"
          :disabled="copying"
          :class="chromeIntentUrl
            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'"
          class="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm w-full transition-all"
        >
          <span v-if="copying">Copying…</span>
          <span v-else-if="!copied">📋 Copy link</span>
          <span v-else>✅ Link copied!</span>
        </button>

        <button
          type="button"
          @click="continueFlow"
          class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm w-full"
        >
          Continue Anyway
        </button>

        <button
          type="button"
          @click="close"
          class="text-slate-500 hover:text-slate-700 text-xs underline mt-1"
        >
          Close
        </button>
      </div>

      <div v-if="copied" class="text-[11px] text-slate-500 pt-2" aria-live="polite">
        You can now paste this link in Safari or Chrome to continue.
      </div>
      <div v-else-if="copyError" class="text-[11px] text-rose-600 pt-2" role="alert">
        {{ copyError }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { isAndroidDevice, buildChromeIntentUrl } from '@/utils/inAppBrowser'

const props = defineProps({
  onContinue: { type: Function, default: null },
  redirectUrl: {
    type: String,
    default: () => (typeof window !== 'undefined' ? window.location.href : '')
  }
})

const emit = defineEmits(['close'])
const visible = ref(true)
const chromeIntentUrl = computed(() => {
  if (!isAndroidDevice()) return ''
  try {
    return buildChromeIntentUrl(props.redirectUrl)
  } catch {
    return ''
  }
})
const copied = ref(false)
const copying = ref(false)
const copyError = ref('')

async function copyLink() {
  if (copying.value) return
  copying.value = true
  copyError.value = ''
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.redirectUrl)
    } else {
      const helper = document.createElement('textarea')
      helper.value = props.redirectUrl
      helper.setAttribute('readonly', '')
      helper.style.position = 'fixed'
      helper.style.opacity = '0'
      document.body.appendChild(helper)
      helper.select()
      const copiedWithFallback = document.execCommand('copy')
      helper.remove()
      if (!copiedWithFallback) throw new Error('copy unavailable')
    }
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {
    copyError.value = 'Copy failed — long-press the address below to copy it manually.'
  } finally {
    copying.value = false
  }
}

function continueFlow() {
  if (typeof props.onContinue === 'function') props.onContinue()
  visible.value = false
  emit('close')
}

function close() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
[role="dialog"] { animation: fadeIn 0.3s ease-in-out; }
</style>
