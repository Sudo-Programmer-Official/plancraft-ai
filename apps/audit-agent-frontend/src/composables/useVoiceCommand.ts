import { ref } from 'vue'
import { apiPost } from '@/lib/api'
import { recordAndSendToBackend } from '@/utils/backendRecorder'
import { useAuthStore } from '@/stores/authStore'

type VoiceMode = 'command' | 'query'

export interface VoiceContext {
  orgId: string | null | undefined
  projectId: string | null | undefined
}

export interface VoiceResult {
  intent?: string
  replyText?: string
  speechUrl?: string | null
  data?: any
}

export function useVoiceCommand() {
  const authStore = useAuthStore()

  const transcript = ref('')
  const isRecording = ref(false)
  const isTranscribing = ref(false)
  const lastResult = ref<VoiceResult | null>(null)
  const error = ref<string | null>(null)

  let recorder: any = null
  let pendingMode: VoiceMode = 'command'
  let pendingContext: VoiceContext | null = null

  async function sendCommand(text: string, context: VoiceContext) {
    if (!context?.orgId || !context?.projectId) {
      throw new Error('Missing team or project context')
    }
    const payload = {
      text,
      orgId: context.orgId,
      projectId: context.projectId,
      uid: authStore?.user?.uid || null,
    }
    const result = await apiPost('/api/voice/command', payload)
    lastResult.value = result
    return result
  }

  async function askWorkspace(text: string, context: VoiceContext) {
    if (!context?.orgId || !context?.projectId) {
      throw new Error('Missing team or project context')
    }
    const payload = {
      text,
      orgId: context.orgId,
      projectId: context.projectId,
      uid: authStore?.user?.uid || null,
    }
    const result = await apiPost('/api/voice/query', payload)
    lastResult.value = result
    return result
  }

  async function finalizeRecording(text: string) {
    if (!pendingContext) return null
    const trimmed = text.trim()
    if (!trimmed) return null

    try {
      const action = pendingMode === 'query' ? askWorkspace : sendCommand
      const result = await action(trimmed, pendingContext)
      transcript.value = trimmed
      return result
    } catch (err: any) {
      console.error('Voice command failed', err)
      error.value = err?.message || 'Voice command failed'
      throw err
    }
  }

  async function startVoice(mode: VoiceMode, context: VoiceContext) {
    if (isRecording.value) return
    transcript.value = ''
    error.value = null
    pendingMode = mode
    pendingContext = context
    isRecording.value = true
    isTranscribing.value = false
    try {
      recorder = await recordAndSendToBackend(async (text: string, isFinal: boolean) => {
        transcript.value = text
        if (isFinal) {
          isTranscribing.value = false
          isRecording.value = false
          await finalizeRecording(text)
        }
      })
    } catch (err: any) {
      console.error('startVoice failed', err)
      isRecording.value = false
      error.value = err?.message || 'Could not start microphone'
      throw err
    }
  }

  async function stopVoice() {
    if (!recorder) return
    try {
      isRecording.value = false
      isTranscribing.value = true
      await recorder._stop?.()
    } finally {
      recorder = null
      isRecording.value = false
    }
  }

  function reset() {
    transcript.value = ''
    lastResult.value = null
    error.value = null
  }

  return {
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
  }
}

export default useVoiceCommand
