import { onBeforeUnmount, ref, watch } from 'vue'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'

export function useAudioRecorder(options = {}) {
  const {
    onTranscription,
    onError,
    logPrefix = '[useAudioRecorder]',
  } = options

  const state = ref('idle')
  const transcript = ref('')
  const durationSeconds = ref(0)
  let timerId = null

  const {
    isRecording,
    isTranscribing,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
  } = useVoiceRecorder((text) => {
    transcript.value = typeof text === 'string' ? text.trim() : ''
    if (typeof onTranscription === 'function') {
      onTranscription(transcript.value)
    }
  })

  function updateState() {
    if (isRecording.value) {
      state.value = 'recording'
      return
    }
    if (isTranscribing.value) {
      state.value = 'transcribing'
      return
    }
    state.value = transcript.value ? 'done' : 'idle'
  }

  function startTimer() {
    if (timerId) return
    timerId = window.setInterval(() => {
      if (isRecording.value) durationSeconds.value += 1
    }, 1000)
  }

  function stopTimer() {
    if (!timerId) return
    window.clearInterval(timerId)
    timerId = null
  }

  async function startRecording() {
    try {
      transcript.value = ''
      durationSeconds.value = 0
      await startVoiceRecording()
      updateState()
    } catch (error) {
      if (typeof onError === 'function') onError(error)
      else console.error(`${logPrefix} Failed to start recording`, error)
    }
  }

  async function stopRecording() {
    try {
      await stopVoiceRecording()
    } catch (error) {
      if (typeof onError === 'function') onError(error)
      else console.error(`${logPrefix} Failed to stop recording`, error)
    } finally {
      updateState()
    }
  }

  function resetRecorder() {
    if (isRecording.value || isTranscribing.value) {
      stopVoiceRecording().catch((error) => {
        if (typeof onError === 'function') onError(error)
        else console.error(`${logPrefix} Failed to reset recorder`, error)
      })
    }

    stopTimer()
    transcript.value = ''
    durationSeconds.value = 0
    state.value = 'idle'
  }

  watch(
    [isRecording, isTranscribing],
    () => {
      if (isRecording.value) startTimer()
      else stopTimer()
      updateState()
    },
    { immediate: true },
  )

  watch(transcript, updateState)

  onBeforeUnmount(() => {
    stopTimer()
  })

  return {
    state,
    transcript,
    durationSeconds,
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    resetRecorder,
  }
}
