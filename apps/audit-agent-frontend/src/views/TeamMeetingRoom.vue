<template>
  <section class="meeting-room">
    <header class="meeting-header">
      <div>
        <h1>{{ meetingTitle }}</h1>
        <p>{{ roomSubtitle }}</p>
      </div>
      <div class="controls">
        <button type="button" @click="toggleMic" :class="{ off: !micEnabled }">
          {{ micEnabled ? 'Mute' : 'Unmute' }}
        </button>
        <button type="button" @click="toggleCamera" :class="{ off: !cameraEnabled }">
          {{ cameraEnabled ? 'Stop Video' : 'Start Video' }}
        </button>
        <button type="button" @click="shareScreen" :disabled="sharingScreen">
          {{ sharingScreen ? 'Sharing…' : 'Share Screen' }}
        </button>
        <button type="button" @click="toggleRecording" :class="{ off: !recording.active }">
          {{ recording.active ? 'Stop Recording' : 'Record' }}
        </button>
        <button type="button" class="leave" @click="leaveMeeting">
          Leave
        </button>
      </div>
    </header>

    <section class="video-grid">
      <div class="video-tile local">
        <video ref="localVideo" autoplay playsinline muted />
        <span class="label">You</span>
      </div>
      <div
        v-for="remote in rtcStore.remoteStreams"
        :key="remote.id"
        class="video-tile"
      >
        <video :ref="setRemoteVideoRef(remote.id)" autoplay playsinline />
      </div>
    </section>

    <aside class="side-panel">
      <section class="chat-panel">
        <header>
          <h2>Chat</h2>
        </header>
        <div class="chat-log" ref="chatLog">
          <div
            v-for="message in rtcStore.chat"
            :key="message.id"
            :class="['chat-message', message.mine ? 'mine' : 'theirs']"
          >
            <span class="text" v-if="message.kind === 'chat'">{{ message.text }}</span>
            <span class="reaction" v-else>{{ message.emoji }}</span>
          </div>
        </div>
        <form class="chat-form" @submit.prevent="sendChat">
          <input
            v-model="chatInput"
            type="text"
            placeholder="Message the team"
            :disabled="!dataChannelOpen"
          />
          <button type="submit" :disabled="!chatInput.trim() || !dataChannelOpen">Send</button>
        </form>
        <div class="reaction-bar">
          <button type="button" @click="sendReaction('👏')">👏</button>
          <button type="button" @click="sendReaction('🔥')">🔥</button>
          <button type="button" @click="sendReaction('👍')">👍</button>
          <button type="button" @click="sendReaction('🎉')">🎉</button>
        </div>
      </section>
    </aside>

    <transition-group name="reaction-overlay" tag="div" class="reaction-overlay">
      <div v-for="item in rtcStore.reactions" :key="item.id" class="reaction-bubble">
        {{ item.emoji }}
      </div>
    </transition-group>

    <div v-if="rtcStore.error" class="error-banner">
      {{ rtcStore.error }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { useTeamRtcStore } from '@/stores/teamRtcStore'
import { useAuthStore } from '@/stores/authStore'
import { apiGet, apiPost, apiDelete } from '@/lib/api'

interface RtcRoom {
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  offerCandidates?: RTCIceCandidateInit[]
  answerCandidates?: RTCIceCandidateInit[]
  metadata?: Record<string, any>
}

const route = useRoute()
const router = useRouter()
const orgStore = useOrgStore()
const meetingStore = useMeetingStore()
const rtcStore = useTeamRtcStore()
const authStore = useAuthStore()

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const meetingIdParam = route.params.meetingId
const meetingId =
  typeof meetingIdParam === 'string'
    ? meetingIdParam
    : Array.isArray(meetingIdParam)
      ? meetingIdParam[0]
      : 'room'

const meetingTitle = computed(() => meetingStore.getById(meetingId)?.title || 'Live Meeting')
const roomSubtitle = computed(() => `Room · ${meetingId}`)

const localVideo = ref<HTMLVideoElement | null>(null)
const chatLog = ref<HTMLDivElement | null>(null)

const state = reactive({
  peer: null as RTCPeerConnection | null,
  dataChannel: null as RTCDataChannel | null,
  pollHandle: null as number | null,
  answerApplied: false,
  offerApplied: false,
  iceCounts: { offer: 0, answer: 0 },
})

const chatInput = ref('')
const micEnabled = ref(true)
const cameraEnabled = ref(true)
const sharingScreen = ref(false)
const dataChannelOpen = ref(false)
const isHost = ref(false)
const recording = reactive({
  active: false,
  chunks: [] as Blob[],
  recorder: null as MediaRecorder | null,
  mimeType: 'audio/webm',
})

const remoteVideoRefs = new Map<string, HTMLVideoElement>()

function setRemoteVideoRef(id: string) {
  return (el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideoRefs.set(id, el)
      const stream = rtcStore.remoteStreams.find((item) => item.id === id)?.stream
      if (stream) el.srcObject = stream
    } else {
      remoteVideoRefs.delete(id)
    }
  }
}

watch(
  () => rtcStore.remoteStreams,
  (streams) => {
    streams.forEach(({ id, stream }) => {
      const el = remoteVideoRefs.get(id)
      if (el && el.srcObject !== stream) {
        el.srcObject = stream
      }
    })
  },
  { deep: true },
)

watch(
  () => rtcStore.chat.length,
  () => {
    requestAnimationFrame(() => {
      if (chatLog.value) {
        chatLog.value.scrollTop = chatLog.value.scrollHeight
      }
    })
  },
)

async function init() {
  if (!orgId.value) {
    rtcStore.error = 'Missing team context'
    return
  }

  orgStore.setOrg(orgId.value)

  if (!meetingStore.getById(meetingId)) {
    await meetingStore.load(orgId.value)
  }

  rtcStore.connectionState = 'connecting'
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    rtcStore.setLocalStream(stream)
    attachStream(localVideo.value, stream)
  } catch (err: any) {
    console.error('Failed to get user media', err)
    rtcStore.error = 'Unable to access microphone/camera. Please enable permissions.'
    return
  }

  const config = buildRtcConfig()
  const peer = new RTCPeerConnection(config)
  state.peer = peer

  rtcStore.localStream?.getTracks().forEach((track) => {
    peer.addTrack(track, rtcStore.localStream as MediaStream)
  })

  peer.ontrack = (event) => {
    const [remoteStream] = event.streams
    if (remoteStream) {
      rtcStore.addRemoteStream(remoteStream)
      event.track.onended = () => {
        rtcStore.removeRemoteStream(remoteStream.id)
      }
    }
  }

  peer.onconnectionstatechange = () => {
    if (!peer.connectionState || peer.connectionState === 'new' || peer.connectionState === 'connecting') {
      rtcStore.connectionState = 'connecting'
    } else if (peer.connectionState === 'connected') {
      rtcStore.connectionState = 'connected'
    } else if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) {
      rtcStore.connectionState = 'failed'
    }
  }

  peer.onicecandidate = async (event) => {
    if (!event.candidate) return
    try {
      await apiPost(`/api/orgs/${orgId.value}/rtc/ice`, {
        roomId: meetingId,
        role: isHost.value ? 'offer' : 'answer',
        candidate: event.candidate,
      })
    } catch (err) {
      console.error('ICE push failed', err)
    }
  }

  peer.ondatachannel = (event) => setupDataChannel(event.channel)

  const room = await apiGet(`/api/orgs/${orgId.value}/rtc/room/${meetingId}`)
  isHost.value = !room?.offer

  if (isHost.value) {
    const channel = peer.createDataChannel('chat')
    setupDataChannel(channel)
    await createAndSendOffer()
  } else {
    await waitForOffer()
    const roomState = (await apiGet(`/api/orgs/${orgId.value}/rtc/room/${meetingId}`)) as RtcRoom
    if (roomState?.offer) {
      await peer.setRemoteDescription(roomState.offer)
      state.offerApplied = true
    }
    await createAndSendAnswer()
  }

  startPolling()
}

function buildRtcConfig(): RTCConfiguration {
  const envServers = import.meta.env.VITE_RTC_ICE_SERVERS
  if (envServers) {
    try {
      const parsed = JSON.parse(envServers)
      if (Array.isArray(parsed)) {
        return { iceServers: parsed }
      }
    } catch (err) {
      console.warn('Failed to parse VITE_RTC_ICE_SERVERS, falling back to defaults', err)
    }
  }
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
    ],
  }
}

async function createAndSendOffer() {
  if (!state.peer) return
  const offer = await state.peer.createOffer()
  await state.peer.setLocalDescription(offer)
  state.offerApplied = true
  await apiPost(`/api/orgs/${orgId.value}/rtc/offer`, {
    roomId: meetingId,
    offer,
    metadata: { title: meetingTitle.value || '', createdBy: authStore.user?.uid || null },
  })
}

async function createAndSendAnswer() {
  if (!state.peer) return
  const answer = await state.peer.createAnswer()
  await state.peer.setLocalDescription(answer)
  state.answerApplied = true
  await apiPost(`/api/orgs/${orgId.value}/rtc/answer`, {
    roomId: meetingId,
    answer,
  })
}

async function waitForOffer() {
  const timeout = Date.now() + 30_000
  while (Date.now() < timeout) {
    const room = (await apiGet(`/api/orgs/${orgId.value}/rtc/room/${meetingId}`)) as RtcRoom | null
    if (room?.offer) return
    await delay(1000)
  }
  rtcStore.error = 'Timed out waiting for host to start the call.'
}

function startPolling() {
  stopPolling()
  const tick = async () => {
    try {
      const room = (await apiGet(`/api/orgs/${orgId.value}/rtc/room/${meetingId}`)) as RtcRoom | null
      if (!room) return
      if (room.answer && state.offerApplied && !state.answerApplied) {
        await state.peer?.setRemoteDescription(room.answer)
        state.answerApplied = true
      }
      if (Array.isArray(room.offerCandidates) && room.offerCandidates.length > state.iceCounts.offer) {
        const newCandidates = room.offerCandidates.slice(state.iceCounts.offer)
        state.iceCounts.offer = room.offerCandidates.length
        await Promise.all(
          newCandidates.map((candidate) =>
            state.peer?.addIceCandidate(candidate).catch((err) => console.error('offer candidate add failed', err)),
          ),
        )
      }
      if (Array.isArray(room.answerCandidates) && room.answerCandidates.length > state.iceCounts.answer) {
        const newAnswerCandidates = room.answerCandidates.slice(state.iceCounts.answer)
        state.iceCounts.answer = room.answerCandidates.length
        await Promise.all(
          newAnswerCandidates.map((candidate) =>
            state.peer?.addIceCandidate(candidate).catch((err) => console.error('answer candidate add failed', err)),
          ),
        )
      }
    } catch (err) {
      console.error('RTC poll failed', err)
    }
  }
  state.pollHandle = window.setInterval(tick, 1500)
}

function stopPolling() {
  if (state.pollHandle) {
    clearInterval(state.pollHandle)
    state.pollHandle = null
  }
}

function setupDataChannel(channel: RTCDataChannel) {
  state.dataChannel = channel
  channel.onopen = () => {
    dataChannelOpen.value = true
  }
  channel.onclose = () => {
    dataChannelOpen.value = false
  }
  channel.onerror = (event) => {
    console.error('Data channel error', event)
  }
  channel.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      if (payload.type === 'chat') {
        rtcStore.pushMessage({
          id: payload.id,
          text: payload.text,
          sender: payload.sender,
          ts: payload.ts,
          mine: payload.sender === authStore.user?.uid,
          kind: 'chat',
        })
      } else if (payload.type === 'reaction') {
        const message = {
          id: payload.id,
          text: '',
          sender: payload.sender,
          ts: payload.ts,
          mine: payload.sender === authStore.user?.uid,
          kind: 'reaction' as const,
          emoji: payload.emoji,
        }
        rtcStore.pushReaction(message)
        rtcStore.pushMessage(message)
      }
    } catch (err) {
      console.error('Failed to parse chat message', err)
    }
  }
}

async function sendChat() {
  if (!state.dataChannel || state.dataChannel.readyState !== 'open') return
  const text = chatInput.value.trim()
  if (!text) return
  const message = {
    type: 'chat',
    id: crypto.randomUUID(),
    text,
    sender: authStore.user?.uid || 'me',
    ts: Date.now(),
  }
  state.dataChannel.send(JSON.stringify(message))
  rtcStore.pushMessage({ ...message, mine: true, kind: 'chat' })
  chatInput.value = ''
}

function sendReaction(emoji: string) {
  if (!state.dataChannel || state.dataChannel.readyState !== 'open') return
  const message = {
    type: 'reaction',
    id: crypto.randomUUID(),
    emoji,
    sender: authStore.user?.uid || 'me',
    ts: Date.now(),
  }
  state.dataChannel.send(JSON.stringify(message))
  const localMessage = { ...message, mine: true, kind: 'reaction' as const }
  rtcStore.pushReaction(localMessage)
  rtcStore.pushMessage(localMessage)
}

function toggleMic() {
  micEnabled.value = !micEnabled.value
  rtcStore.localStream?.getAudioTracks().forEach((track) => {
    track.enabled = micEnabled.value
  })
}

function toggleCamera() {
  cameraEnabled.value = !cameraEnabled.value
  rtcStore.localStream?.getVideoTracks().forEach((track) => {
    track.enabled = cameraEnabled.value
  })
}

async function shareScreen() {
  if (!state.peer) return
  try {
    sharingScreen.value = true
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const screenTrack = screenStream.getVideoTracks()[0]
    const sender = state.peer
      .getSenders()
      .find((item) => item.track && item.track.kind === 'video')
    if (sender && screenTrack) {
      await sender.replaceTrack(screenTrack)
      screenTrack.onended = async () => {
        const cameraTrack = rtcStore.localStream?.getVideoTracks()[0]
        if (cameraTrack) {
          await sender.replaceTrack(cameraTrack)
        }
        sharingScreen.value = false
      }
    }
  } catch (err) {
    console.error('Screen share failed', err)
    sharingScreen.value = false
  }
}

async function toggleRecording() {
  if (recording.active) {
    await stopRecording()
    return
  }
  await startRecording()
}

async function startRecording() {
  try {
    if (!rtcStore.localStream) throw new Error('No local stream available')
    const stream = new MediaStream()
    rtcStore.localStream.getAudioTracks().forEach((track) => stream.addTrack(track))
    if (!stream.getAudioTracks().length) {
      throw new Error('No audio track detected')
    }
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
    const recorder = new MediaRecorder(stream, { mimeType: mime })
    recording.mimeType = mime
    recording.chunks = []
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recording.chunks.push(event.data)
      }
    }
    recorder.onstop = async () => {
      if (!recording.chunks.length) return
      const blob = new Blob(recording.chunks, { type: recording.mimeType })
      await uploadRecordingBlob(blob)
      recording.chunks = []
    }
    recorder.start()
    recording.recorder = recorder
    recording.active = true
  } catch (err) {
    console.error('Failed to start recording', err)
    window.alert('Could not start recording. Check microphone permissions.')
    recording.active = false
    recording.recorder = null
  }
}

async function stopRecording() {
  if (!recording.recorder) return
  try {
    recording.recorder.stop()
  } catch (err) {
    console.error('Failed to stop recorder', err)
  } finally {
    recording.active = false
    recording.recorder = null
  }
}

async function uploadRecordingBlob(blob: Blob) {
  if (!orgId.value || !meetingId) return
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const base64 = bufferToBase64(arrayBuffer)
    const projectId = meetingStore.getById(meetingId)?.projectId || null
    await meetingStore.uploadRecording(orgId.value, meetingId, {
      audio: { data: `data:${recording.mimeType};base64,${base64}`, mimeType: recording.mimeType },
      projectId,
      autoTranscribe: true,
    })
    await meetingStore.load(orgId.value)
    window.alert('Recording uploaded. Transcription will appear shortly.')
  } catch (err) {
    console.error('Upload recording failed', err)
    window.alert('Failed to upload recording.')
  }
}

async function leaveMeeting() {
  stopPolling()
  if (recording.active) {
    await stopRecording()
  }
  try {
    await apiDelete(`/api/orgs/${orgId.value}/rtc/room/${meetingId}`)
  } catch (err) {
    // ignore cleanup failure
  }
  if (state.dataChannel) {
    try {
      state.dataChannel.close()
    } catch {}
  }
  if (state.peer) {
    state.peer.getTransceivers().forEach((transceiver) => transceiver.stop())
    state.peer.close()
  }
  rtcStore.reset()
  router.push({ name: 'team-meetings', params: { orgId: orgId.value } })
}

function attachStream(video: HTMLVideoElement | null, stream: MediaStream | null) {
  if (video && stream && video.srcObject !== stream) {
    video.srcObject = stream
  }
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  stopPolling()
  if (state.dataChannel) {
    try {
      state.dataChannel.close()
    } catch {}
  }
  if (state.peer) {
    state.peer.getSenders().forEach((sender) => sender.track?.stop())
    state.peer.close()
  }
  if (recording.active) {
    stopRecording()
  }
  rtcStore.reset()
})

watch(
  () => rtcStore.localStream,
  (stream) => {
    attachStream(localVideo.value, stream || null)
  },
  { immediate: true },
)

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
</script>

<style scoped>
.meeting-room {
  display: grid;
  grid-template-columns: 3fr 1fr;
  grid-template-rows: auto 1fr;
  gap: 16px;
  min-height: calc(100vh - 120px);
}

.meeting-header {
  grid-column: 1 / 3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.controls button {
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.controls button.off {
  background: #6b7280;
}

.controls button.leave {
  background: #dc2626;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  background: #111827;
  padding: 12px;
  border-radius: 16px;
  position: relative;
}

.video-tile {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  min-height: 200px;
}

.video-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

.video-tile .label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(15, 23, 42, 0.7);
  color: #fff;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-panel {
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.chat-log {
  flex: 1;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-message {
  max-width: 80%;
  border-radius: 12px;
  padding: 8px 10px;
  font-size: 0.9rem;
}

.chat-message.mine {
  align-self: flex-end;
  background: rgba(79, 70, 229, 0.18);
}

.chat-message.theirs {
  background: rgba(15, 23, 42, 0.08);
}

.reaction {
  font-size: 1.4rem;
}

.chat-form {
  display: flex;
  gap: 8px;
}

.chat-form input {
  flex: 1;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.2);
  padding: 8px;
}

.chat-form button {
  border: none;
  border-radius: 10px;
  background: #4338ca;
  color: #fff;
  padding: 8px 12px;
}

.reaction-bar {
  display: flex;
  gap: 6px;
}

.reaction-bar button {
  flex: 1;
  border: none;
  background: rgba(79, 70, 229, 0.12);
  border-radius: 10px;
  padding: 8px 0;
  font-size: 1.1rem;
  cursor: pointer;
}

.reaction-overlay {
  position: fixed;
  pointer-events: none;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 80px;
  gap: 12px;
}

.reaction-bubble {
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
  border-radius: 50%;
  font-size: 2rem;
  animation: floatUp 3s ease-out forwards;
}

@keyframes floatUp {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-200px);
    opacity: 0;
  }
}

.error-banner {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc2626;
  color: #fff;
  padding: 10px 16px;
  border-radius: 999px;
}

@media (max-width: 1040px) {
  .meeting-room {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }
  .meeting-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .side-panel {
    order: 3;
  }
}
</style>
