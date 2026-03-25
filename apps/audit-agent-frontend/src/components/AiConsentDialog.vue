<template>
  <el-dialog
    v-model="open"
    width="min(560px, calc(100vw - 2rem))"
    class="ai-consent-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="space-y-6 text-[#1A1A1A]">
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-[0.32em] text-[#5B6FD8]">AI disclosure</p>
        <h2 class="text-2xl font-bold leading-tight text-[#111111]">Allow secure AI processing?</h2>
        <p class="text-base leading-7 text-[#1A1A1A]">
          When you use AI features, the text, voice recordings, images, or workspace content you
          choose to send may be processed by secure third-party AI providers, including OpenAI, to
          generate plans, summaries, and suggestions.
        </p>
        <p class="text-base leading-7 text-[#1A1A1A]">
          We only send the content needed to fulfill your request. You can choose not to allow this,
          but AI-powered features will stay off in the app until you do.
        </p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-[#1A1A1A]">
        Review the full details in our
        <RouterLink to="/privacy" class="font-semibold text-[#111111] underline underline-offset-4">
          Privacy Policy
        </RouterLink>.
      </div>

      <div class="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          class="inline-flex w-full items-center justify-center rounded-xl bg-[#111111] px-5 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#000000] sm:w-auto sm:min-w-[140px]"
          @click="handleDecision(true)"
        >
          Allow
        </button>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:min-w-[140px]"
          @click="handleDecision(false)"
        >
          Not now
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AI_CONSENT_PROMPT_EVENT, submitAiConsentDecision } from '@/services/aiConsentService'

const open = ref(false)

function handlePrompt() {
  open.value = true
}

function handleDecision(granted) {
  open.value = false
  submitAiConsentDecision(!!granted)
}

onMounted(() => {
  window.addEventListener(AI_CONSENT_PROMPT_EVENT, handlePrompt)
})

onBeforeUnmount(() => {
  window.removeEventListener(AI_CONSENT_PROMPT_EVENT, handlePrompt)
})
</script>

<style scoped>
.ai-consent-dialog :deep(.el-dialog) {
  border-radius: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.96);
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
}

.ai-consent-dialog :deep(.el-dialog__header) {
  display: none;
}

.ai-consent-dialog :deep(.el-dialog__body) {
  padding: 1.75rem;
}
</style>
