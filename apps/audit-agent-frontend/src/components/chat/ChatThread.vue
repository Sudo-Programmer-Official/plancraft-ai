<template>
  <section class="chat-thread">
    <header>
      <div>
        <h2>{{ room?.name || 'Channel' }}</h2>
        <p v-if="room?.description">{{ room.description }}</p>
      </div>
      <div class="presence" v-if="presenceList.length">
        <span v-for="user in presenceList" :key="user.uid" class="avatar" :title="user.name || user.uid">
          {{ initials(user.name || user.uid) }}
        </span>
      </div>
    </header>

    <div class="messages" ref="messagesEl">
      <div v-for="message in messages" :key="message.id" class="message" :class="{ mine: message.senderUid === currentUid }">
        <div class="meta">
          <strong>{{ message.senderName || 'User' }}</strong>
          <span>{{ formatTimestamp(message.createdAt) }}</span>
          <button type="button" class="pin" @click="$emit('pin', message, !message.pinned)">
            {{ message.pinned ? 'Unpin' : 'Pin' }}
          </button>
        </div>
        <p v-if="message.text" class="content">{{ message.text }}</p>
        <ul v-if="message.attachments?.length" class="attachments">
          <li v-for="(attachment, idx) in message.attachments" :key="idx">
            <a :href="attachment.url" target="_blank" rel="noopener">Attachment {{ idx + 1 }}</a>
          </li>
        </ul>
      </div>
    </div>

    <footer>
      <div class="typing" v-if="typingUsers.length">
        <span v-for="user in typingUsers" :key="user.uid">{{ user.name || 'Someone' }} typing…</span>
      </div>
      <form class="composer" @submit.prevent="send">
        <textarea
          v-model="draft"
          rows="3"
          placeholder="Message the channel"
          @input="onTyping(true)"
          @blur="onTyping(false)"
        ></textarea>
        <div class="actions">
          <label class="attachment">
            📎
            <input type="file" multiple @change="onFileChange" />
          </label>
          <button type="submit" :disabled="!draft.trim() && !attachments.length">Send</button>
        </div>
      </form>
      <ul v-if="attachments.length" class="attachment-preview">
        <li v-for="(file, idx) in attachments" :key="idx">
          {{ file.name }}
          <button type="button" @click="removeAttachment(idx)">×</button>
        </li>
      </ul>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ChatMessage, ChatRoom, PresenceUser } from '@/stores/teamChatStore'

const props = defineProps<{
  room: ChatRoom | null
  messages: ChatMessage[]
  presence: PresenceUser[]
  typingUsers: PresenceUser[]
  currentUid?: string | null
}>()

const emit = defineEmits(['send', 'typing', 'pin', 'upload'])

const draft = ref('')
const attachments = ref<File[]>([])
const messagesEl = ref<HTMLDivElement | null>(null)

const presenceList = computed(() => props.presence || [])

watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  },
)

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function formatTimestamp(value: any) {
  if (!value) return ''
  try {
    const date = value instanceof Date ? value : new Date(value)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function onTyping(value: boolean) {
  emit('typing', value)
}

async function send() {
  if (!draft.value.trim() && !attachments.value.length) return
  emit('send', { text: draft.value, attachments: attachments.value })
  draft.value = ''
  attachments.value = []
  emit('typing', false)
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  attachments.value = [...attachments.value, ...Array.from(input.files)]
  input.value = ''
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
}

defineExpose({
  setDraft(value: string) {
    draft.value = value
  },
})
</script>

<style scoped>
.chat-thread {
  display: flex;
  flex: 1;
  flex-direction: column;
  background: var(--bg-elevated);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-soft);
  color: var(--text-primary);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-soft);
}

.presence {
  display: flex;
  gap: 6px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 18%, var(--bg-elevated) 82%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: color-mix(in srgb, var(--accent) 70%, var(--text-primary) 30%);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-surface);
}

.message {
  align-self: flex-start;
  max-width: 70%;
  padding: 12px;
  border-radius: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: color-mix(in srgb, var(--shadow-elevated) 25%, transparent 75%);
}

.message.mine {
  align-self: flex-end;
  background: color-mix(in srgb, var(--accent) 22%, var(--bg-elevated) 78%);
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border-soft) 55%);
  color: var(--text-primary);
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.pin {
  border: none;
  background: none;
  color: color-mix(in srgb, var(--accent) 70%, var(--text-primary) 30%);
  cursor: pointer;
  font-size: 0.75rem;
}

.content {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.attachments {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attachments a {
  color: color-mix(in srgb, var(--accent) 70%, var(--text-primary) 30%);
  font-size: 0.85rem;
}

footer {
  padding: 16px;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.typing {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  gap: 8px;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border-soft);
  padding: 10px 12px;
  font-family: inherit;
  resize: vertical;
  background: var(--bg-surface);
  color: var(--text-primary);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

textarea:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 55%, transparent 45%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent 80%);
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.actions button {
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: var(--accent-gradient);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.actions button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(99, 102, 241, 0.28);
}

.actions button:disabled {
  background: color-mix(in srgb, var(--text-secondary) 20%, transparent 80%);
  cursor: not-allowed;
  box-shadow: none;
}

.attachment {
  position: relative;
  cursor: pointer;
  color: color-mix(in srgb, var(--accent) 70%, var(--text-primary) 30%);
}

.attachment input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.attachment-preview {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.attachment-preview li {
  background: color-mix(in srgb, var(--accent) 22%, var(--bg-elevated) 78%);
  padding: 6px 10px;
  border-radius: 10px;
  display: flex;
  gap: 6px;
  align-items: center;
  color: var(--text-primary);
}

.attachment-preview button {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-primary);
}
</style>
