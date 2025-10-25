<template>
  <aside class="chat-sidebar">
    <header>
      <div>
        <h2>Channels</h2>
        <p v-if="projectName">{{ projectName }}</p>
      </div>
      <button type="button" @click="$emit('create-room')">＋</button>
    </header>
    <ul>
      <li
        v-for="room in rooms"
        :key="room.id"
        :class="{ active: room.id === activeRoomId }"
        @click="$emit('select', room.id)"
      >
        <div class="title">
          <span class="dot" :class="{ busy: isActive(room.id) }"></span>
          <strong>{{ room.name }}</strong>
        </div>
        <small v-if="room.description">{{ room.description }}</small>
        <div class="meta">
          <span v-if="presenceMap[room.id]?.length">{{ presenceMap[room.id].length }} online</span>
          <span v-if="room.lastMessageAt">· {{ formatRelative(room.lastMessageAt) }}</span>
        </div>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatRoom, PresenceUser } from '@/stores/teamChatStore'

const props = defineProps<{
  rooms: ChatRoom[]
  activeRoomId: string | null
  presence: Record<string, PresenceUser[]>
  projectName?: string | null
}>()

defineEmits(['select', 'create-room'])

const presenceMap = computed(() => props.presence || {})

function isActive(roomId: string) {
  return (presenceMap.value[roomId] || []).length > 0
}

function formatRelative(value: any) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch (err) {
    return ''
  }
}
</script>

<style scoped>
.chat-sidebar { width: 240px; background: #fff; border-right: 1px solid rgba(15,23,42,0.08); display: flex; flex-direction: column; }
header { display: flex; justify-content: space-between; align-items: center; padding: 14px; border-bottom: 1px solid rgba(15,23,42,0.08); }
header h2 { margin: 0; font-size: 1rem; }
header button { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #4338ca; }
ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
li { padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; border-bottom: 1px solid rgba(15,23,42,0.04); }
li.active { background: rgba(79,70,229,0.12); }
.title { display: flex; align-items: center; gap: 8px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(15,23,42,0.2); }
.dot.busy { background: #10b981; }
.meta { font-size: 0.75rem; color: rgba(15,23,42,0.5); display: flex; gap: 6px; }
small { color: rgba(15,23,42,0.55); }
</style>
