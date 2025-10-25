import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ChatMessage {
  id: string
  text: string
  sender: string
  ts: number
  mine: boolean
  kind: 'chat' | 'reaction'
  emoji?: string
}

export interface IceCounts {
  offer: number
  answer: number
}

export const useTeamRtcStore = defineStore('team-rtc', () => {
  const localStream = ref<MediaStream | null>(null)
  const remoteStreams = ref<Array<{ id: string; stream: MediaStream }>>([])
  const connectionState = ref<'idle' | 'connecting' | 'connected' | 'failed'>('idle')
  const error = ref<string | null>(null)
  const chat = ref<ChatMessage[]>([])
  const reactions = ref<ChatMessage[]>([])

  function setLocalStream(stream: MediaStream | null) {
    localStream.value = stream
  }

  function addRemoteStream(stream: MediaStream) {
    if (!stream) return
    const id = stream.id
    const exists = remoteStreams.value.some((item) => item.id === id)
    if (!exists) {
      remoteStreams.value.push({ id, stream })
    }
  }

  function removeRemoteStream(id: string) {
    remoteStreams.value = remoteStreams.value.filter((item) => item.id !== id)
  }

  function pushMessage(message: ChatMessage) {
    chat.value.push(message)
  }

  function pushReaction(message: ChatMessage) {
    reactions.value.push(message)
    // auto-expire reaction after 3 seconds
    setTimeout(() => {
      reactions.value = reactions.value.filter((item) => item.id !== message.id)
    }, 3000)
  }

  function reset() {
    connectionState.value = 'idle'
    error.value = null
    chat.value = []
    reactions.value = []
    remoteStreams.value = []
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop())
    }
    localStream.value = null
  }

  return {
    localStream,
    remoteStreams,
    connectionState,
    error,
    chat,
    reactions,
    setLocalStream,
    addRemoteStream,
    removeRemoteStream,
    pushMessage,
    pushReaction,
    reset,
  }
})
