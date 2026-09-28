<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="iabh-title"
      aria-describedby="iabh-desc"
      class="bg-white dark:bg-[#1f1f1f] text-gray-800 dark:text-gray-200 rounded-2xl shadow-2xl max-w-sm w-[90%] p-6 text-center space-y-5 outline-none"
      tabindex="0"
    >
      <div class="text-4xl">🌿</div>
      <h2 id="iabh-title" class="text-xl font-semibold">Open in your browser</h2>
      <p id="iabh-desc" class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        For the best and most secure sign-in experience, please open this page in
        <strong>Safari</strong> or <strong>Chrome</strong>.  
        Some in-app browsers (like LinkedIn or Instagram) don’t fully support Google login.
      </p>

      <div class="text-xs text-gray-500">
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
          class="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm w-full transition-all"
        >
          <span v-if="!copied">📋 Copy link</span>
          <span v-else>✅ Link copied!</span>
        </button>

        <button
          type="button"
          @click="continueFlow"
          class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm w-full"
        >
          Continue Anyway
        </button>

        <button
          type="button"
          @click="close"
          class="text-gray-400 text-xs underline mt-1"
        >
          Close
        </button>
      </div>

      <div v-if="copied" class="text-[11px] text-gray-400 pt-2">
        You can now paste this link in Safari or Chrome to continue.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { isAndroidDevice, buildChromeIntentUrl } from '@/utils/inAppBrowser'

const props = defineProps({
  onContinue: { type: Function, default: null },
  redirectUrl: { type: String, default: window.location.href }
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

function copyLink() {
  try {
    navigator.clipboard.writeText(props.redirectUrl)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch (e) {
    alert('Copy failed — please long-press and copy manually.')
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