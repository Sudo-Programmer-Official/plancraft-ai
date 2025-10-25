import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import { apiGet, apiPost } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export interface ChatRoom {
  id: string
  name: string
  description?: string
  projectId?: string | null
  updatedAt?: string | Date
  lastMessageAt?: string | Date | null
  pinnedMessageIds?: string[]
}

export interface ChatMessage {
  id: string
  text: string
  senderUid: string | null
  senderName?: string | null
  createdAt?: string | Date
  attachments?: Array<{ url?: string; path?: string; mimeType?: string }>
  pinned?: boolean
  reactions?: Array<{ emoji: string; uid: string }>
}

export interface PresenceUser {
  uid: string
  name?: string | null
  lastSeen: number
}

export const useTeamChatStore = defineStore('team-chat', () => {
  const authStore = useAuthStore()

  const socket = ref<Socket | null>(null)
  const connected = ref(false)
  const connecting = ref(false)
  const error = ref<string | null>(null)

  const rooms = ref<ChatRoom[]>([])
  const currentRoomId = ref<string | null>(null)
  const messages = ref<Record<string, ChatMessage[]>>({})
  const messageCursor = ref<Record<string, string | null>>({})
  const loadingMessages = ref(false)
  const presence = ref<Record<string, PresenceUser[]>>({})
  const typingUsers = ref<Record<string, PresenceUser[]>>({})
  const latestSummary = ref<Record<string, { summary: string; bullets: string[]; tasks: any[]; model: string | null }>>({})
  const replySuggestions = ref<string[]>([])
  const coachMessage = ref<string>('')
  const searchResults = ref<any[]>([])

  const currentMessages = computed(() => {
    if (!currentRoomId.value) return []
    return messages.value[currentRoomId.value] || []
  })

  function ensureSocket(orgId: string) {
    if (socket.value || connecting.value) return
    connecting.value = true
    const token = authStore.token || (() => {
      try {
        return localStorage.getItem('token')
      } catch {
        return null
      }
    })()
    const path = import.meta.env.VITE_SOCKET_IO_PATH || '/ws/chat'
    socket.value = io({
      path,
      transports: ['websocket'],
      auth: { token, orgId },
    })
    socket.value.on('connect', () => {
      connected.value = true
      connecting.value = false
      error.value = null
    })
    socket.value.on('disconnect', () => {
      connected.value = false
    })
    socket.value.on('connect_error', (err) => {
      console.error('[chat] connect error', err)
      error.value = err?.message || 'Failed to connect to chat'
      connecting.value = false
    })
    socket.value.on('chat:message', (message: ChatMessage) => {
      appendMessage(message.roomId || currentRoomId.value || '', message)
    })
    socket.value.on('chat:pin', ({ roomId, messageId, pinned }) => {
      const roomMessages = messages.value[roomId]
      if (!roomMessages) return
      const idx = roomMessages.findIndex((msg) => msg.id === messageId)
      if (idx >= 0) {
        roomMessages[idx].pinned = !!pinned
      }
    })
    socket.value.on('presence:update', ({ roomId, list }) => {
      presence.value[roomId] = list || []
    })
    socket.value.on('chat:typing', ({ roomId, uid, name, typing }) => {
      const list = typingUsers.value[roomId] || []
      const existingIndex = list.findIndex((entry) => entry.uid === uid)
      if (typing) {
        if (existingIndex === -1) {
          typingUsers.value[roomId] = [...list, { uid, name, lastSeen: Date.now() }]
        } else {
          list[existingIndex].lastSeen = Date.now()
          list[existingIndex].name = name
        }
      } else if (existingIndex >= 0) {
        list.splice(existingIndex, 1)
        typingUsers.value[roomId] = [...list]
      }
    })
  }

  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    connected.value = false
  }

  function reset() {
    try {
      socket.value?.disconnect()
    } catch {}
    socket.value = null
    connected.value = false
    connecting.value = false
    error.value = null
    rooms.value = []
    currentRoomId.value = null
    messages.value = {}
    messageCursor.value = {}
    presence.value = {}
    typingUsers.value = {}
    latestSummary.value = {}
    replySuggestions.value = []
    coachMessage.value = ''
    searchResults.value = []
  }

  async function loadRooms(orgId: string) {
    const res = await apiGet(`/api/orgs/${orgId}/chat/rooms`)
    rooms.value = Array.isArray(res) ? res : []
    if (!currentRoomId.value && rooms.value.length) {
      await joinRoom(orgId, rooms.value[0].id)
    }
    return rooms.value
  }

  async function createRoom(orgId: string, payload: { name: string; description?: string; projectId?: string | null }) {
    const room = await apiPost(`/api/orgs/${orgId}/chat/rooms`, payload)
    rooms.value.unshift(room)
    return room
  }

  async function joinRoom(orgId: string, roomId: string) {
    ensureSocket(orgId)
    if (!socket.value) return
    if (currentRoomId.value) {
      socket.value.emit('room:leave', { roomId: currentRoomId.value })
    }
    currentRoomId.value = roomId
    socket.value.emit('room:join', { roomId })
    replySuggestions.value = []
    coachMessage.value = ''
    if (!messages.value[roomId]) {
      await loadMessages(orgId, roomId)
    }
  }

  async function loadMessages(orgId: string, roomId: string, opts: { reset?: boolean } = {}) {
    loadingMessages.value = true
    try {
      if (opts.reset) {
        messageCursor.value[roomId] = null
        messages.value[roomId] = []
      }
      const cursor = messageCursor.value[roomId]
      const query = new URLSearchParams()
      if (cursor) query.set('cursor', cursor)
      const res = await apiGet(`/api/orgs/${orgId}/chat/rooms/${roomId}/messages${query.toString() ? `?${query.toString()}` : ''}`)
      const fetched = Array.isArray(res?.messages) ? res.messages : []
      messages.value[roomId] = [...fetched, ...(messages.value[roomId] || [])]
      messageCursor.value[roomId] = res?.nextCursor || null
      return fetched
    } finally {
      loadingMessages.value = false
    }
  }

  function appendMessage(roomId: string, message: ChatMessage & { roomId?: string }) {
    if (!roomId) return
    if (!messages.value[roomId]) messages.value[roomId] = []
    messages.value[roomId] = [...messages.value[roomId], message]
  }

  function emitMessage(orgId: string, payload: { roomId: string; text: string; attachments?: any[] }) {
    ensureSocket(orgId)
    socket.value?.emit('chat:message', payload)
  }

  function emitTyping(orgId: string, roomId: string, typing: boolean) {
    ensureSocket(orgId)
    socket.value?.emit('chat:typing', { roomId, typing })
  }

  function togglePin(orgId: string, roomId: string, messageId: string, pinned: boolean) {
    ensureSocket(orgId)
    socket.value?.emit('chat:pin', { roomId, messageId, pinned })
  }

  async function uploadAttachment(orgId: string, roomId: string, file: { data: string; mimeType?: string; filename?: string }) {
    return apiPost(`/api/orgs/${orgId}/chat/rooms/${roomId}/uploads`, file)
  }

  async function summarizeRoom(orgId: string, roomId: string, payload: { projectId?: string | null; createTasks?: boolean } = {}) {
    const res = await apiPost(`/api/orgs/${orgId}/chat/rooms/${roomId}/summary`, payload)
    latestSummary.value[roomId] = {
      summary: res?.summary || '',
      bullets: Array.isArray(res?.bullets) ? res.bullets : [],
      tasks: Array.isArray(res?.tasks) ? res.tasks : [],
      model: res?.model || null,
    }
    return res
  }

  async function requestReply(orgId: string, roomId: string, payload: { tone?: string }) {
    const res = await apiPost(`/api/orgs/${orgId}/chat/rooms/${roomId}/reply`, payload)
    replySuggestions.value = Array.isArray(res?.suggestions) ? res.suggestions : []
    return res
  }

  async function searchOrg(orgId: string, query: string) {
    const params = new URLSearchParams({ q: query })
    const res = await apiGet(`/api/orgs/${orgId}/chat/search?${params.toString()}`)
    searchResults.value = Array.isArray(res?.results) ? res.results : []
    return res
  }

  async function requestCoach(orgId: string, roomId: string, payload: { persona?: string }) {
    const res = await apiPost(`/api/orgs/${orgId}/chat/coach`, { roomId, ...payload })
    coachMessage.value = res?.message || ''
    return res
  }

  return {
    socket,
    connected,
    connecting,
    error,
    rooms,
    currentRoomId,
    messages,
    currentMessages,
    presence,
    typingUsers,
    latestSummary,
    replySuggestions,
    coachMessage,
    searchResults,
    loadRooms,
    createRoom,
    joinRoom,
    loadMessages,
    emitMessage,
    emitTyping,
    togglePin,
    uploadAttachment,
    disconnect,
    reset,
    summarizeRoom,
    requestReply,
    searchOrg,
    requestCoach,
  }
})
