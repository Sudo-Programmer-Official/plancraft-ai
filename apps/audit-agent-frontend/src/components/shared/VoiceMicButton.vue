<template>
  <div v-if="voiceEnabled" class="voice-mic-root">
    <transition name="mic-fade">
      <button
        v-show="!open"
        type="button"
        class="voice-mic-btn"
        :class="{ recording: isRecording }"
        aria-label="Start voice capture"
        @click="openDialog"
      >
        <span class="icon">🎤</span>
      </button>
    </transition>

    <transition name="mic-dialog">
      <div v-if="open" class="mic-backdrop" @click.self="closeDialog">
        <div class="mic-panel" role="dialog" aria-modal="true">
          <header class="mic-header">
            <div>
              <h2>Quick Voice Task</h2>
              <p>Speak or type a quick note. We’ll convert it into a task.</p>
            </div>
            <button type="button" class="close-btn" @click="closeDialog" aria-label="Close dialog">✕</button>
          </header>

          <section class="mic-body">
            <textarea
              ref="textareaRef"
              v-model="note"
              placeholder="Captured transcript appears here…"
              rows="4"
              class="mic-textarea"
            />

            <div class="mic-status">
              <span v-if="isRecording" class="status recording">● Recording… tap stop to finish</span>
              <span v-else-if="isTranscribing" class="status transcribing">⏳ Processing audio…</span>
              <span v-else class="status idle">Tip: Share one action at a time for best results.</span>
            </div>

            <div class="mic-actions">
              <button
                type="button"
                class="toggle-record"
                :class="{ active: isRecording }"
                :disabled="isSaving"
                @click="toggleRecording"
              >
                <span v-if="isRecording">⏹ Stop</span>
                <span v-else>🎙️ Start Recording</span>
              </button>
              <button
                type="button"
                class="generate-btn"
                :disabled="!note.trim() || isSaving || isTranscribing"
                @click="generateTask"
              >
                {{ isSaving ? 'Saving…' : 'Generate Task' }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'
import { useToastStore } from '@/stores/toastStore'
import { createTaskFromVoice } from '@/services/taskService'
import { trackEvent } from '@/services/analytics'

const emit = defineEmits<{ (e: 'created', task: any): void }>()

const open = ref(false)
const note = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isSaving = ref(false)

const envFlag = computed(() => import.meta.env.VITE_DISABLE_CUSTOMER_MIC !== 'true')
const voiceEnabled = computed(() =>
  envFlag.value && typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices,
)

const toastStore = useToastStore()

const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecorder((text: string) => {
  note.value = text
})

function openDialog() {
  if (!voiceEnabled.value) {
    toastStore.push('Voice capture not supported on this device.', { type: 'warning', duration: 3600 })
    return
  }
  open.value = true
  tickFocus()
  trackEvent('voice_mic_opened')
}

function closeDialog() {
  open.value = false
  cleanupRecording()
  note.value = ''
}

async function toggleRecording() {
  try {
    if (!isRecording.value) {
      await startRecording()
      trackEvent('voice_mic_recording_start')
    } else {
      await stopRecording()
      trackEvent('voice_mic_recording_stop')
    }
  } catch (err) {
    console.error('[VoiceMicButton] recording toggle failed', err)
    toastStore.push('Microphone access denied or unavailable.', { type: 'error' })
  }
}

async function generateTask() {
  if (!note.value.trim()) {
    toastStore.push('Add a note or record audio before saving.', { type: 'warning' })
    return
  }
  isSaving.value = true
  try {
    const details = note.value.trim()
    const title = details.split('\n')[0].slice(0, 80) || 'Voice Task'
    const result = await createTaskFromVoice({
      title,
      details,
      source: 'voice-mic',
    })
    emit('created', result.task)
    toastStore.push('Task created from voice note.', { type: 'success', duration: 2800 })
    const warning = result?.reminder?.warning
    if (reminder?.missingSetup) {
      toastStore.push('Tip: enable reminder channels to receive notifications.', { type: 'info', duration: 4000 })
    }
    if (warning) {
      toastStore.push(warning, { type: 'warning', duration: 4000 })
    }
    closeDialog()
  } catch (err) {
    console.error('[VoiceMicButton] task creation failed', err)
    toastStore.push('Could not create task. Please try again.', {
      type: 'error',
      action: {
        label: 'Retry',
        handler: () => generateTask(),
      },
    })
  } finally {
    isSaving.value = false
  }
}

function cleanupRecording() {
  if (isRecording.value) {
    stopRecording().catch(() => {})
  }
}

async function tickFocus() {
  await nextTick()
  textareaRef.value?.focus()
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    closeDialog()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  cleanupRecording()
})
</script>

<style scoped>
.voice-mic-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1050;
}

.voice-mic-btn {
  width: 62px;
  height: 62px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(145deg, #5a3ffb, #8b5cf6);
  color: #fff;
  font-size: 1.8rem;
  box-shadow: 0 18px 32px rgba(90, 63, 251, 0.45);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  position: relative;
  overflow: hidden;
}

.voice-mic-btn::after {
  content: '';
  position: absolute;
  inset: -50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.voice-mic-btn:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 24px 42px rgba(90, 63, 251, 0.55);
}

.voice-mic-btn:hover::after {
  opacity: 1;
}

.voice-mic-btn.recording {
  animation: pulse 1.2s infinite alternate;
}

.voice-mic-btn .icon {
  position: relative;
  z-index: 2;
}

.mic-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 11, 19, 0.72);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.mic-panel {
  width: min(440px, 100%);
  border-radius: 20px;
  background: rgba(14, 24, 45, 0.92);
  border: 1px solid rgba(120, 140, 210, 0.28);
  box-shadow: 0 30px 55px rgba(5, 10, 25, 0.55);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #eaf0ff;
}

.mic-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.mic-header h2 {
  margin: 0 0 4px;
  font-size: 1.45rem;
}

.mic-header p {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(202, 212, 238, 0.82);
}

.close-btn {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border-radius: 999px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.mic-textarea {
  width: 100%;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(120, 140, 210, 0.25);
  color: #f8fafc;
  padding: 14px;
  resize: vertical;
  min-height: 140px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.mic-textarea:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.6);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

.mic-status {
  min-height: 20px;
}

.status {
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status.recording {
  color: #fca5a5;
}
.status.transcribing {
  color: #fde68a;
}
.status.idle {
  color: rgba(203, 213, 225, 0.8);
}

.mic-actions {
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.toggle-record,
.generate-btn {
  flex: 1;
  border: none;
  border-radius: 999px;
  padding: 12px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.2s ease;
}

.toggle-record {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}

.toggle-record:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.28);
}

.toggle-record.active {
  background: rgba(239, 68, 68, 0.25);
  color: #fecaca;
  box-shadow: 0 18px 32px rgba(248, 113, 113, 0.25);
}

.generate-btn {
  background: linear-gradient(135deg, #5f3ef8, #8b5cf6);
  color: #fff;
  box-shadow: 0 18px 32px rgba(91, 53, 234, 0.45);
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 24px 42px rgba(91, 53, 234, 0.55);
}

.generate-btn:disabled,
.toggle-record:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 18px 32px rgba(90, 63, 251, 0.5);
  }
  100% {
    transform: scale(1.06);
    box-shadow: 0 22px 36px rgba(139, 92, 246, 0.6);
  }
}

.mic-fade-enter-active,
.mic-fade-leave-active {
  transition: opacity 0.2s ease;
}
.mic-fade-enter-from,
.mic-fade-leave-to {
  opacity: 0;
}

.mic-dialog-enter-active,
.mic-dialog-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.mic-dialog-enter-from,
.mic-dialog-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@media (max-width: 640px) {
  .voice-mic-root {
    right: 16px;
    bottom: 16px;
  }
  .voice-mic-btn {
    width: 56px;
    height: 56px;
  }
  .mic-panel {
    padding: 18px;
  }
  .mic-actions {
    flex-direction: column;
  }
}
</style>
