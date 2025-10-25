<template>
  <section class="team-chat" v-if="orgId">
    <ChatSidebar
      :rooms="rooms"
      :active-room-id="currentRoomId"
      :presence="presence"
      :project-name="currentProject?.name || null"
      @select="selectRoom"
      @create-room="createRoom"
    />
    <ChatThread
      :room="currentRoom"
      :messages="currentMessages"
      :presence="presence[currentRoomId || ''] || []"
      :typing-users="typingUsers[currentRoomId || ''] || []"
      :current-uid="authStore.user?.uid || null"
      @send="handleSend"
      @typing="handleTyping"
      @pin="handlePin"
    />
  </section>
  <div v-else class="chat-empty">
    <p>Select a team to start chatting.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatThread from '@/components/chat/ChatThread.vue'
import { useTeamChatStore } from '@/stores/teamChatStore'
import { useOrgStore } from '@/stores/orgStore'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const chatStore = useTeamChatStore()
const orgStore = useOrgStore()
const projectStore = useProjectStore()
const authStore = useAuthStore()

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const { rooms, currentRoomId, currentMessages, presence, typingUsers } = storeToRefs(chatStore)

const currentRoom = computed(() => rooms.value.find((room) => room.id === currentRoomId.value) || null)
const currentProject = computed(() => {
  const projectId = currentRoom.value?.projectId
  if (!projectId) return null
  return projectStore.projects.find((project) => project.id === projectId) || null
})

onMounted(async () => {
  if (!orgId.value) return
  orgStore.setOrg(orgId.value)
  await Promise.all([projectStore.load(orgId.value), chatStore.loadRooms(orgId.value)])
})

watch(orgId, async (id, prev) => {
  if (!id || id === prev) return
  orgStore.setOrg(id)
  chatStore.reset()
  await Promise.all([projectStore.load(id), chatStore.loadRooms(id)])
})

onBeforeUnmount(() => {
  chatStore.reset()
})

async function selectRoom(roomId: string) {
  if (!orgId.value) return
  await chatStore.joinRoom(orgId.value, roomId)
}

async function createRoom() {
  if (!orgId.value) return
  const name = window.prompt('Channel name?')
  if (!name) return
  const description = window.prompt('Description (optional)') || ''
  const room = await chatStore.createRoom(orgId.value, { name, description })
  await chatStore.joinRoom(orgId.value, room.id)
}

async function handleSend(payload: { text: string; attachments: File[] }) {
  if (!orgId.value || !currentRoomId.value) return
  const attachments = [] as Array<{ url?: string; path?: string; mimeType?: string }>
  for (const file of payload.attachments) {
    const base64 = await fileToBase64(file)
    const upload = await chatStore.uploadAttachment(orgId.value, currentRoomId.value, {
      data: base64,
      filename: file.name,
      mimeType: file.type,
    })
    attachments.push(upload)
  }
  chatStore.emitMessage(orgId.value, {
    roomId: currentRoomId.value,
    text: payload.text,
    attachments,
  })
}

function handleTyping(typing: boolean) {
  if (!orgId.value || !currentRoomId.value) return
  chatStore.emitTyping(orgId.value, currentRoomId.value, typing)
}

function handlePin(message: any, pinned: boolean) {
  if (!orgId.value || !currentRoomId.value) return
  chatStore.togglePin(orgId.value, currentRoomId.value, message.id, pinned)
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
</script>

<style scoped>
.team-chat { display: flex; gap: 0; background: #f4f6fb; border-radius: 18px; overflow: hidden; min-height: calc(100vh - 140px); }
.chat-empty { padding: 32px; border: 1px dashed rgba(15,23,42,0.2); border-radius: 16px; background: #fff; text-align: center; color: rgba(15,23,42,0.6); }
</style>
