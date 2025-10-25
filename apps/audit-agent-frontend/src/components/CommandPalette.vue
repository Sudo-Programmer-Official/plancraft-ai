<template>
  <transition name="fade">
    <div v-if="open" class="palette-backdrop" @click.self="close">
      <div class="palette-panel" role="dialog" aria-modal="true">
        <header class="palette-header">
          <h2>Quick Command</h2>
          <button type="button" class="palette-close" @click="close" aria-label="Close">✕</button>
        </header>

        <div class="palette-toggle">
          <button
            type="button"
            :class="['toggle-btn', mode === 'command' && 'is-active']"
            @click="mode = 'command'"
          >
            ⚡ Command
          </button>
          <button
            type="button"
            :class="['toggle-btn', mode === 'query' && 'is-active']"
            @click="mode = 'query'"
          >
            🔍 Ask Workspace
          </button>
        </div>

        <form class="palette-form" @submit.prevent="handleSubmit">
          <div class="input-wrapper">
            <input
              ref="inputRef"
              v-model="inputText"
              type="text"
              :placeholder="mode === 'command' ? 'Add task finalize onboarding…' : 'What is due today?'"
              @keydown.esc.prevent="close"
            />
            <div class="input-actions">
              <button
                type="button"
                class="mic-btn"
                :class="{ recording: isRecording }"
                :disabled="!hasContext || isTranscribing"
                @click="toggleVoice"
                aria-label="Voice capture"
              >
                <span v-if="isRecording">⏹</span>
                <span v-else-if="isTranscribing">⏳</span>
                <span v-else>🎤</span>
              </button>
              <button type="submit" class="submit-btn" :disabled="!inputText.trim() || loading">
                {{ loading ? 'Working…' : mode === 'command' ? 'Run' : 'Ask' }}
              </button>
            </div>
          </div>
          <p v-if="!hasContext" class="context-warning">
            Select a team project to run voice commands.
          </p>
        </form>

        <div v-if="transcript" class="transcript">
          <strong>Transcript:</strong> {{ transcript }}
        </div>

        <p v-if="error" class="palette-error">{{ error }}</p>

        <section v-if="result" class="palette-result">
          <header>
            <h3>{{ resultTitle }}</h3>
            <p class="reply-text">{{ result.replyText }}</p>
          </header>

          <ul v-if="Array.isArray(result.data)" class="result-list">
            <li v-for="item in result.data" :key="item.id || item.title">
              <div>
                <strong>{{ item.title || 'Untitled' }}</strong>
                <span v-if="item.status" class="status">· {{ item.status }}</span>
              </div>
              <small v-if="item.assignedTo">Assigned to {{ item.assignedTo }}</small>
            </li>
          </ul>
        </section>
        <footer class="palette-footer">
          <span>⌘/Ctrl + J</span>
          <span>{{ mode === 'command' ? 'Create or update tasks' : 'Ask for summaries' }}</span>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useVoiceCommand } from '@/composables/useVoiceCommand'

const props = defineProps<{
  open: boolean
  orgId: string | null
  projectId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const inputRef = ref<HTMLInputElement>()
const inputText = ref('')
const mode = ref<'command' | 'query'>('command')

const {
  transcript,
  isRecording,
  isTranscribing,
  lastResult,
  error,
  sendCommand,
  askWorkspace,
  startVoice,
  stopVoice,
  reset,
} = useVoiceCommand()

const loading = ref(false)

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const hasContext = computed(() => !!props.orgId && !!props.projectId)
const result = computed(() => lastResult.value)
const resultTitle = computed(() => {
  if (!lastResult.value) return ''
  if (mode.value === 'command') return 'Command Result'
  if (lastResult.value.intent === 'get_status') return 'Project Status'
  if (lastResult.value.intent === 'get_tasks') return 'Tasks'
  return 'Workspace Answer'
})

watch(open, async (value) => {
  if (value) {
    await nextTick()
    inputRef.value?.focus()
  } else {
    stopVoice()
    inputText.value = ''
    reset()
  }
})

watch(result, (value) => {
  if (value?.speechUrl) {
    const audio = new Audio(value.speechUrl)
    audio.play().catch(() => {})
  }
})

function close() {
  open.value = false
}

async function handleSubmit() {
  if (!inputText.value.trim() || !hasContext.value) return
  loading.value = true
  error.value = null
  try {
    if (mode.value === 'command') {
      await sendCommand(inputText.value.trim(), {
        orgId: props.orgId,
        projectId: props.projectId,
      })
      inputText.value = ''
    } else {
      await askWorkspace(inputText.value.trim(), {
        orgId: props.orgId,
        projectId: props.projectId,
      })
    }
  } catch (err: any) {
    console.error('Command palette submission failed', err)
  } finally {
    loading.value = false
  }
}

async function toggleVoice() {
  if (!hasContext.value) return
  if (!isRecording.value) {
    await startVoice(mode.value, { orgId: props.orgId, projectId: props.projectId })
  } else {
    await stopVoice()
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 1200;
}
.palette-panel {
  width: min(640px, calc(100vw - 32px));
  background: #0f172a;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 35px 65px rgba(15, 23, 42, 0.45);
  padding: 20px;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.palette-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.palette-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}
.palette-close {
  border: none;
  background: rgba(148, 163, 184, 0.16);
  color: inherit;
  border-radius: 999px;
  width: 32px;
  height: 32px;
  cursor: pointer;
}
.palette-toggle {
  display: inline-flex;
  background: rgba(148, 163, 184, 0.15);
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
}
.toggle-btn {
  border: none;
  background: transparent;
  color: #e2e8f0;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 500;
}
.toggle-btn.is-active {
  background: rgba(99, 102, 241, 0.35);
}
.palette-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-wrapper {
  display: flex;
  align-items: center;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.7);
  padding-left: 12px;
}
.input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  color: inherit;
  outline: none;
  font-size: 1rem;
  padding: 12px 0;
}
.input-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 12px;
}
.mic-btn,
.submit-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.18s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #f8fafc;
}
.mic-btn {
  background: rgba(99, 102, 241, 0.25);
}
.mic-btn.recording {
  background: rgba(239, 68, 68, 0.42);
}
.submit-btn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}
.mic-btn:disabled,
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.context-warning {
  margin: 0;
  font-size: 0.85rem;
  color: #fbbf24;
  text-align: left;
}
.transcript {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.12);
  font-size: 0.92rem;
  color: #c7d2fe;
}
.palette-error {
  margin: 0;
  color: #f87171;
  font-size: 0.9rem;
}
.palette-result {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(15, 23, 42, 0.75);
}
.palette-result header h3 {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 600;
}
.reply-text {
  margin: 0;
  color: rgba(226, 232, 240, 0.8);
  white-space: pre-line;
}
.result-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-list li {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.1);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.status {
  font-size: 0.85rem;
  color: rgba(196, 181, 253, 0.85);
}
.palette-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: rgba(226, 232, 240, 0.6);
}
@media (max-width: 480px) {
  .palette-panel {
    padding: 16px;
    gap: 12px;
  }
  .palette-footer {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
}
</style>
