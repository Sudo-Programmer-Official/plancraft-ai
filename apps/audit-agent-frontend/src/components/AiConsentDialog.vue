<template>
  <el-dialog
    v-model="open"
    width="min(560px, calc(100vw - 2rem))"
    class="ai-consent-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="space-y-5 text-slate-100">
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-[0.32em] text-indigo-300/80">AI disclosure</p>
        <h2 class="text-2xl font-semibold text-white">Allow secure AI processing?</h2>
        <p class="text-sm text-indigo-100/85">
          When you use AI features, the text, voice recordings, images, or workspace content you
          choose to send may be processed by secure third-party AI providers, including OpenAI, to
          generate plans, summaries, and suggestions.
        </p>
        <p class="text-sm text-indigo-100/75">
          We only send the content needed to fulfill your request. You can choose not to allow this,
          but AI-powered features will stay off in the app until you do.
        </p>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-indigo-100/85">
        Review the full details in our
        <RouterLink to="/privacy" class="font-semibold text-white underline underline-offset-4">
          Privacy Policy
        </RouterLink>.
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          @click="handleDecision(true)"
        >
          Allow
        </button>
        <button
          type="button"
          class="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(155deg, rgba(15, 23, 42, 0.96), rgba(49, 46, 129, 0.94), rgba(30, 41, 59, 0.96));
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(18px);
}

.ai-consent-dialog :deep(.el-dialog__header) {
  display: none;
}

.ai-consent-dialog :deep(.el-dialog__body) {
  padding: 1.5rem;
}
</style>
