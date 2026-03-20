<template>
  <div
    class="voice-controller"
    :class="[
      `voice-controller--${state}`,
      { 'voice-controller--disabled': props.disabled }
    ]"
  >
    <button
      type="button"
      class="voice-controller__button"
      :class="{ 'voice-controller__button--recording': state === 'recording' }"
      :aria-pressed="state === 'recording'"
      :aria-label="primaryLabel"
      :disabled="props.disabled || state === 'transcribing'"
      @click="handlePrimaryPress"
    >
      <svg
        v-if="state === 'recording'"
        class="voice-controller__icon"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.8"
        fill="none"
      >
        <rect x="8" y="8" width="8" height="8" rx="2" />
      </svg>
      <svg
        v-else
        class="voice-controller__icon"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.6"
        fill="none"
      >
        <path
          stroke-linecap="round"
          d="M12 15.5a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5.5a3 3 0 0 0 3 3Z"
        />
        <path d="M7.5 11.5V12a4.5 4.5 0 0 0 9 0v-.5" />
        <path stroke-linecap="round" d="M12 16v3.5" />
        <path stroke-linecap="round" d="M9.5 19.5h5" />
      </svg>
      <span v-if="state === 'recording'" class="voice-controller__pulse" aria-hidden="true"></span>
    </button>

    <div
      class="voice-controller__text"
      :class="{
        'voice-controller__text--active': state === 'recording' || state === 'transcribing',
        'voice-controller__text--transcript': state === 'done' && transcript
      }"
      aria-live="polite"
    >
      <p v-if="state === 'recording'">
        Listening…
        <span class="voice-controller__time">{{ formattedDuration }}</span>
      </p>
      <div v-else-if="state === 'transcribing'" class="voice-controller__processing">
        <span class="voice-controller__spinner" aria-hidden="true"></span>
        <p>{{ processingMessage }}</p>
      </div>
      <p v-else-if="transcript" class="voice-controller__transcript">{{ transcript }}</p>
    </div>

    <button
      v-if="state === 'done'"
      type="button"
      class="voice-controller__reset"
      :aria-label="transcript ? 'Clear transcript' : 'Reset voice recorder'"
      @click="resetRecorder"
    >
      <svg
        class="voice-controller__reset-icon"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.6"
        fill="none"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 12a8 8 0 0 1 13.6-5.6" />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M20 12a8 8 0 0 1-13.6 5.6"
        />
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v4h4" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 20v-4h-4" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed, watch, ref, onBeforeUnmount } from 'vue'
import { useAudioRecorder } from '@/composables/useAudioRecorder'
import { ElMessage } from 'element-plus'

const props = defineProps({
  disabled: Boolean,
  autoCommit: {
    type: Boolean,
    default: true,
  },
  resetTrigger: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['transcribed', 'state-change', 'processing-start', 'processing-end', 'processing-error'])

const {
  state,
  transcript,
  durationSeconds,
  errorMessage,
  isRecording,
  isTranscribing,
  startRecording,
  stopRecording,
  resetRecorder,
} = useAudioRecorder({
  onTranscription: (text) => {
    if (text) emit('transcribed', text)
    emit('processing-end')
  },
  logPrefix: '[VoiceRecorder]',
})

const processingMessage = ref('Transcribing your task…')
let processingTimer = null

const formattedDuration = computed(() => {
  const seconds = Math.max(0, durationSeconds.value || 0)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const primaryLabel = computed(() => {
  if (props.disabled) return 'Voice input disabled'
  if (state.value === 'recording') return 'Stop recording'
  if (state.value === 'transcribing') return 'Transcribing audio'
  return 'Start recording'
})

async function handlePrimaryPress() {
  if (props.disabled || state.value === 'transcribing') return
  try {
    if (state.value === 'recording') await stopRecording()
    else await startRecording()
  } catch (error) {
    console.warn('[VoiceRecorder] primary action failed', error)
  }
}

watch(
  () => state.value,
  (val) => {
    emit('state-change', val)
    if (processingTimer) {
      clearTimeout(processingTimer)
      processingTimer = null
    }
    if (val === 'transcribing') {
      processingMessage.value = 'Transcribing your task…'
      processingTimer = window.setTimeout(() => {
        processingMessage.value = 'Still processing… almost there.'
      }, 5000)
      emit('processing-start')
    } else if (val === 'idle' || val === 'done') {
      emit('processing-end')
    } else if (val === 'error') {
      emit('processing-end')
      emit('processing-error')
      ElMessage.error(errorMessage.value || 'Transcription failed. Try again.')
    }
  },
)

watch(
  () => props.resetTrigger,
  () => {
    resetRecorder()
  },
)

onBeforeUnmount(() => {
  if (processingTimer) {
    clearTimeout(processingTimer)
    processingTimer = null
  }
})
</script>

<style scoped>
.voice-controller {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  transition: border-color 0.2s ease, background 0.2s ease;
  width: 100%;
}

.voice-controller--recording {
  border-color: rgba(248, 113, 113, 0.7);
  background: rgba(248, 113, 113, 0.08);
}

.voice-controller--transcribing {
  border-color: rgba(129, 140, 248, 0.6);
}

.voice-controller--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.voice-controller__button {
  position: relative;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: radial-gradient(circle at 30% 30%, #5eead4, #2563eb);
  color: #fefefe;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.voice-controller__button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.voice-controller__button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
}

.voice-controller__button--recording {
  background: radial-gradient(circle at 30% 30%, #fca5a5, #dc2626);
  box-shadow: 0 0 18px rgba(220, 38, 38, 0.5);
}

.voice-controller__icon {
  width: 22px;
  height: 22px;
}

.voice-controller__pulse {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220, 38, 38, 0.35), transparent 70%);
  animation: pulse 1.6s infinite;
}

.voice-controller__text {
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  width: 100%;
}

.voice-controller__text p {
  margin: 0;
  width: 100%;
  white-space: normal;
  word-break: break-word;
}

.voice-controller__text--active {
  align-items: flex-start;
}

.voice-controller__text--transcript {
  align-items: flex-start;
  text-align: left;
}

.voice-controller__processing {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
}

.voice-controller__spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #a5b4fc;
  animation: spin 1s linear infinite;
}

.voice-controller__transcript {
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}

.voice-controller__time {
  font-weight: 600;
  color: #fcd34d;
  margin-left: 0.25rem;
}

.voice-controller__reset {
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  color: rgba(255, 255, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
}

.voice-controller__reset:hover {
  background: rgba(255, 255, 255, 0.2);
}

.voice-controller__reset-icon {
  width: 20px;
  height: 20px;
}

@keyframes pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.6;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 600px) {
  .voice-controller {
    padding: 0.55rem 0.8rem;
  }
}
</style>
