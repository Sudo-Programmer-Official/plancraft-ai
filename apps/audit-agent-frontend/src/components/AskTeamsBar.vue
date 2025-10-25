<template>
  <section class="ask-teams">
    <div class="ask-teams__field">
      <textarea
        ref="inputEl"
        v-model="draft"
        class="ask-teams__input"
        rows="1"
        placeholder="Ask Teams anything about your projects…"
        :disabled="assistant.loading"
        @keydown.enter="handleEnter"
        @input="syncSize"
      />
      <button type="button" class="ask-teams__button" :disabled="disabled" @click="submit">
        <span v-if="assistant.loading">…</span>
        <span v-else>Ask</span>
      </button>
    </div>

    <p v-if="assistant.error" class="ask-teams__error">{{ assistant.error }}</p>

    <div v-if="assistant.loading" class="ask-teams__typing">
      <span class="dot" />
      <span class="dot" />
      <span class="dot" />
    </div>

    <div v-if="recentMessages.length" class="ask-teams__history" ref="historyEl">
      <article v-for="message in recentMessages" :key="message.id" class="message" :class="message.role">
        <header>
          <span class="avatar">{{ message.role === 'user' ? '🙋‍♂️' : '🤖' }}</span>
          <span class="label">{{ message.role === 'user' ? 'You' : 'Assistant' }}</span>
          <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
        </header>
        <p class="content">{{ message.text }}</p>
        <button
          v-if="message.speech"
          type="button"
          class="playback"
          @click="playSpeech(message.speech, message.speechVolume)"
        >
          ▶ Play reply
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAssistantStore } from '@/stores/assistantStore'
import { useFeedStore } from '@/stores/feedStore'
import { useToastStore } from '@/stores/toastStore'
import { trackAssistantInteraction } from '@/services/analytics'

const props = defineProps<{ orgId: string | null }>()

const assistant = useAssistantStore()
const feedStore = useFeedStore()
const toastStore = useToastStore()
const draft = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const historyEl = ref<HTMLDivElement | null>(null)
let audioElement: HTMLAudioElement | null = null

const disabled = computed(() => assistant.loading || !draft.value.trim() || !props.orgId)

const recentMessages = computed(() => assistant.messages.slice(-6))

function syncSize() {
  if (!inputEl.value) return
  inputEl.value.style.height = 'auto'
  inputEl.value.style.height = `${Math.min(120, inputEl.value.scrollHeight)}px`
}

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey) return
  event.preventDefault()
  submit()
}

async function submit() {
  if (!props.orgId || !draft.value.trim()) return
  const text = draft.value.trim()
  draft.value = ''
  syncSize()
  const result = await assistant.ask(props.orgId, text, { speak: false })
  if (!result) {
    toastStore.push('Assistant request failed. Retry?', {
      type: 'error',
      action: {
        label: 'Retry',
        handler: () => submit(),
      },
    })
  } else {
    toastStore.push('Assistant replied.', { type: 'success', duration: 2200 })
    trackAssistantInteraction({
      orgId: props.orgId,
      intent: result?.intent?.intent || result?.action?.type || 'unknown',
      hasSpeech: !!result?.speech,
      latencyMs: result?.latencyMs ?? null,
    })
  }
  if (props.orgId) {
    feedStore.fetchFeed(props.orgId, { reset: true }).catch((err) => {
      console.error('[AskTeamsBar] feed refresh failed', err)
      toastStore.push('Feed refresh failed.', {
        type: 'warning',
        action: {
          label: 'Retry',
          handler: () => feedStore.fetchFeed(props.orgId!, { reset: true }),
        },
      })
    })
  }
  await nextTick()
  scrollHistory()
}

function scrollHistory() {
  if (!historyEl.value) return
  historyEl.value.scrollTop = historyEl.value.scrollHeight
}

function playSpeech(dataUrl: string, volume?: number | null) {
  try {
    audioElement?.pause()
    audioElement = new Audio(dataUrl)
    audioElement.volume = typeof volume === 'number' ? Math.min(1, Math.max(0, volume)) : 0.8
    audioElement.play().catch((err) => {
      console.error('[AskTeamsBar] autoplay blocked', err)
      toastStore.push('Autoplay blocked. Tap play again to listen.', { type: 'info', duration: 3000 })
    })
  } catch (err) {
    console.error('[AskTeamsBar] failed to play speech', err)
    toastStore.push('Unable to play assistant audio.', { type: 'warning', duration: 3000 })
  }
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

watch(
  () => assistant.messages.length,
  () => nextTick(scrollHistory),
)

onMounted(() => {
  syncSize()
})
</script>

<style scoped>
.ask-teams {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(30, 64, 175, 0.75));
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.18);
  color: #f8fafc;
}

.ask-teams__field {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.ask-teams__input {
  flex: 1;
  min-height: 44px;
  resize: none;
  border: none;
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 0.95rem;
  font-family: inherit;
  background: rgba(15, 23, 42, 0.65);
  color: inherit;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.35);
}

.ask-teams__input:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.9);
}

.ask-teams__button {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.ask-teams__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.ask-teams__button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(79, 70, 229, 0.35);
}

.ask-teams__error {
  margin: 0;
  font-size: 0.85rem;
  color: #fecaca;
}

.ask-teams__typing {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.ask-teams__typing .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(226, 232, 240, 0.8);
  animation: bounce 1s infinite ease-in-out;
}

.ask-teams__typing .dot:nth-child(2) {
  animation-delay: 0.2s;
}
.ask-teams__typing .dot:nth-child(3) {
  animation-delay: 0.4s;
}

.ask-teams__history {
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 6px;
}

.message {
  background: rgba(15, 23, 42, 0.75);
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message.user {
  background: rgba(30, 64, 175, 0.65);
}

.message header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.85);
}

.message .avatar {
  font-size: 1rem;
}

.message .content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
  color: rgba(241, 245, 249, 0.95);
  font-size: 0.95rem;
}

.message .timestamp {
  margin-left: auto;
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.8);
}

.message .playback {
  align-self: flex-start;
  border: none;
  background: rgba(59, 130, 246, 0.15);
  color: #bfdbfe;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 0.8rem;
  cursor: pointer;
}

.message .playback:hover {
  background: rgba(59, 130, 246, 0.25);
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .ask-teams {
    padding: 14px;
  }
  .ask-teams__history {
    max-height: 180px;
  }
}
</style>
