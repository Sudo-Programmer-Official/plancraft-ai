<!-- src/components/InAppBrowserWarning.vue -->
<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    @keydown.esc.prevent="close"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="iabw-title"
      aria-describedby="iabw-desc"
      class="bg-white text-gray-900 rounded-xl shadow-2xl max-w-sm w-[90%] p-6 text-center space-y-4 outline-none"
      tabindex="0"
      @keyup.enter.prevent="continueFlow"
      @click.self.stop
    >
      <div class="text-3xl">⚠️</div>
      <h2 id="iabw-title" class="text-lg font-semibold">In-App Browser Detected</h2>
      <p id="iabw-desc" class="text-sm text-gray-600">
        Please open this page in <strong>Safari</strong> or <strong>Chrome</strong> for a secure sign-in experience.
        In-app browsers (e.g. LinkedIn, Instagram) can block Google login.
      </p>

      <!-- Optional hint to open in default browser -->
      <div class="text-[12px] text-gray-500">
        Tip: Tap the <strong>•••</strong> menu and choose <em>Open in Browser</em>.
      </div>

      <div class="flex justify-center gap-3 pt-3">
        <button
          type="button"
          @click="continueFlow"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          Continue Anyway
        </button>
        <button
          type="button"
          @click="close"
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>

      <div v-if="autoSeconds > 0" class="text-[11px] text-gray-500 pt-1">
        Continuing automatically in {{ countdown }}s…
      </div>
    </div>

    <!-- click outside closes (so users aren’t trapped) -->
    <div class="absolute inset-0" @click="close" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watchEffect } from 'vue'

const props = defineProps({
  onContinue: { type: Function, default: null },
  /** Auto-continue after N seconds. Set 0 to disable */
  autoSeconds: { type: Number, default: 5 }
})

const visible = ref(true)
const countdown = ref(props.autoSeconds)
let timer = null
let tick = null

function continueFlow() {
  if (typeof props.onContinue === 'function') {
    props.onContinue()
  }
  visible.value = false
  clearTimers()
}

function close() {
  visible.value = false
  clearTimers()
}

function clearTimers() {
  if (timer) clearTimeout(timer)
  if (tick) clearInterval(tick)
  timer = null
  tick = null
}

onMounted(() => {
  // focus the dialog for keyboard accessibility
  queueMicrotask(() => {
    const el = document.querySelector('[role="dialog"]')
    el?.focus?.()
  })

  if (props.autoSeconds > 0) {
    timer = setTimeout(continueFlow, props.autoSeconds * 1000)
    tick = setInterval(() => {
      if (countdown.value > 0) countdown.value -= 1
    }, 1000)
  }
})

onBeforeUnmount(clearTimers)

// If the component is hidden externally, stop timers
watchEffect(() => { if (!visible.value) clearTimers() })
</script>

<style scoped>
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
[role="dialog"] { animation: fadeIn 0.25s ease-in; }
</style>