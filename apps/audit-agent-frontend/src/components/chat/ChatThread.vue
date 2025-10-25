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
</script>

<style scoped>
.chat-thread { display: flex; flex: 1; flex-direction: column; background: #f9fafb; border-radius: 16px; overflow: hidden; }
header { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fff; border-bottom: 1px solid rgba(15,23,42,0.08); }
.presence { display: flex; gap: 6px; }
.avatar { width: 28px; height: 28px; border-radius: 50%; background: rgba(79,70,229,0.16); display: flex; align-items: center; justify-content: center; font-weight: 600; }
.messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.message { align-self: flex-start; max-width: 70%; padding: 12px; border-radius: 14px; background: #fff; border: 1px solid rgba(15,23,42,0.08); display: flex; flex-direction: column; gap: 4px; }
.message.mine { align-self: flex-end; background: rgba(79,70,229,0.12); }
.meta { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: rgba(15,23,42,0.6); }
.pin { border: none; background: none; color: #4338ca; cursor: pointer; font-size: 0.75rem; }
.content { margin: 0; font-size: 0.95rem; color: rgba(15,23,42,0.85); white-space: pre-wrap; }
.attachments { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.attachments a { color: #4338ca; font-size: 0.85rem; }
footer { padding: 16px; background: #fff; border-top: 1px solid rgba(15,23,42,0.08); display: flex; flex-direction: column; gap: 10px; }
.typing { font-size: 0.8rem; color: rgba(15,23,42,0.6); display: flex; gap: 8px; }
.composer { display: flex; flex-direction: column; gap: 8px; }
textarea { width: 100%; border-radius: 12px; border: 1px solid rgba(15,23,42,0.15); padding: 10px 12px; font-family: inherit; resize: vertical; }
.actions { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
.actions button { padding: 8px 14px; border: none; border-radius: 10px; background: linear-gradient(135deg, #4338ca, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
.actions button:disabled { background: rgba(15,23,42,0.2); cursor: not-allowed; }
.attachment { position: relative; cursor: pointer; color: #4338ca; }
.attachment input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.attachment-preview { list-style: none; margin: 0; padding: 0; display: flex; gap: 10px; flex-wrap: wrap; }
.attachment-preview li { background: rgba(79,70,229,0.1); padding: 6px 10px; border-radius: 10px; display: flex; gap: 6px; align-items: center; }
.attachment-preview button { border: none; background: none; cursor: pointer; color: #1f2937; }
</style>
