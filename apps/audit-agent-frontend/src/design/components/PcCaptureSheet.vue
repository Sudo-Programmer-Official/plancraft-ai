<template>
  <PcSheet :open="open" title="What do you need to do?" @update:open="$emit('update:open', $event)">
    <form class="pc-capture" @submit.prevent="submit">
      <div class="pc-capture__field">
        <label :for="fieldId" class="pc-sr-only">Task or plan</label>
        <textarea
          :id="fieldId"
          v-model="text"
          autofocus
          rows="4"
          placeholder="Type something…"
          class="pc-capture__input"
          enterkeyhint="done"
          @keydown.enter.meta.prevent="submit"
          @keydown.enter.ctrl.prevent="submit"
        ></textarea>
        <VoiceRecorder
          class="pc-capture__mic"
          surface="quick_capture"
          :icon-only="true"
          :disabled="busy"
          :reset-trigger="voiceResetTrigger"
          @transcribed="handleVoiceTranscript"
        />
      </div>
      <PcButton type="submit" variant="primary" size="lg" block :icon="Sparkles" :disabled="!text.trim()" :loading="busy">
        Plan it
      </PcButton>
    </form>
  </PcSheet>
</template>

<script setup>
import { ref, useId, watch } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import PcSheet from './PcSheet.vue'
import PcButton from './PcButton.vue'
import VoiceRecorder from '@/components/VoiceRecorder.vue'

// Universal capture behind the "+" tab: free text or voice, turned into a plan.
const props = defineProps({
  open: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open', 'submit', 'voice'])

const fieldId = `pc-capture-${useId()}`
const text = ref('')
const voiceResetTrigger = ref(0)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) text.value = ''
  },
)

function submit() {
  const value = text.value.trim()
  if (!value || props.busy) return
  emit('submit', value)
}

function handleVoiceTranscript(transcript) {
  const value = String(transcript || '').trim()
  if (!value) return
  const current = text.value.trim()
  text.value = current ? `${current}\n${value}` : value
  voiceResetTrigger.value += 1
}
</script>

<style scoped>
.pc-capture {
  display: grid;
  gap: var(--pc-space-4);
}

.pc-capture__field {
  position: relative;
}

.pc-capture__input {
  display: block;
  width: 100%;
  min-height: 7.5rem;
  padding: var(--pc-space-4) var(--pc-space-4) var(--pc-space-10);
  border: 1px solid var(--pc-border-strong);
  border-radius: var(--pc-radius-lg);
  background: var(--pc-bg);
  color: var(--pc-text);
  font-family: var(--pc-font);
  font-size: 1rem; /* 16px: stops iOS zooming on focus */
  line-height: 1.5;
  resize: none;
}

.pc-capture__input::placeholder {
  color: var(--pc-text-subtle);
}

.pc-capture__input:focus {
  outline: none;
  border-color: var(--pc-accent);
  box-shadow: 0 0 0 3px var(--pc-accent-soft);
}

.pc-capture__mic {
  position: absolute;
  right: var(--pc-space-2);
  bottom: var(--pc-space-2);
}

.pc-capture__mic :deep(.voice-controller__button) {
  width: 2.75rem;
  height: 2.75rem;
  background: transparent;
  color: var(--pc-text-muted);
  box-shadow: none;
}

.pc-capture__mic :deep(.voice-controller__button:not(:disabled):hover) {
  color: var(--pc-accent-text);
  background: var(--pc-accent-soft);
  transform: none;
  box-shadow: none;
}

.pc-capture__mic :deep(.voice-controller__button--recording) {
  color: var(--pc-danger);
  background: var(--pc-danger-soft);
}

.pc-capture__mic :deep(.voice-controller__reset) {
  display: none;
}
</style>
