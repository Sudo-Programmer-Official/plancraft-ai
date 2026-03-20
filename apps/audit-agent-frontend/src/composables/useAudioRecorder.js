import { computed, onBeforeUnmount, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import {
  AudioSessionCategoryOption,
  AudioSessionMode,
  CapacitorAudioRecorder,
} from '@capgo/capacitor-audio-recorder'
import api from '@/services/api'
import { recordAndSendToBackend } from '@/utils/backendRecorder'

const MAX_DURATION_MS = 60_000
const STOP_FALLBACK_MS = 1_800
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm']

function canUseBrowserAudioCapture() {
  return !!navigator?.mediaDevices?.getUserMedia
}

function canUseNativeAudioRecorder() {
  return !!Capacitor?.isNativePlatform?.()
}

function formatRecorderError(error) {
  if (!error) return { message: 'Unknown error', code: null }
  return {
    message: error?.message || error?.localizedMessage || String(error),
    code: error?.code || error?.errorCode || null,
    name: error?.name || null,
  }
}

function inferAudioFilename(blob, fallbackExt = 'webm') {
  const blobType = String(blob?.type || '').toLowerCase()
  if (blobType.includes('ogg')) return 'speech.ogg'
  if (blobType.includes('mp4') || blobType.includes('mpeg') || blobType.includes('aac') || blobType.includes('m4a')) {
    return 'speech.m4a'
  }
  if (blobType.includes('wav')) return 'speech.wav'
  return `speech.${fallbackExt}`
}

function inferFileExtFromUri(uri) {
  const match = String(uri || '').match(/\.([a-z0-9]+)(?:\?|#|$)/i)
  return match?.[1]?.toLowerCase() || 'm4a'
}

function pickMimeType() {
  try {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return MIME_CANDIDATES[0]
    }
    return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) || MIME_CANDIDATES[0]
  } catch (_) {
    return MIME_CANDIDATES[0]
  }
}

export function useAudioRecorder(options = {}) {
  const { onTranscription, autoStopMs = MAX_DURATION_MS, logPrefix = '[VoiceRecorder]' } = options

  const state = ref('idle') // idle | recording | transcribing | done | error
  const transcript = ref('')
  const durationSeconds = ref(0)
  const errorMessage = ref('')

  const isRecording = computed(() => state.value === 'recording')
  const isTranscribing = computed(() => state.value === 'transcribing')

  let mediaRecorder = null
  let backendRecorder = null
  let stream = null
  let recordedChunks = []
  let tickId = null
  let autoStopId = null
  let stopTimeoutId = null
  let stopRequested = false
  let stopHandled = false
  let nativeRecorderActive = false

  const clearTimers = (resetDuration = false) => {
    if (tickId) {
      clearInterval(tickId)
      tickId = null
    }
    if (autoStopId) {
      clearTimeout(autoStopId)
      autoStopId = null
    }
    if (stopTimeoutId) {
      clearTimeout(stopTimeoutId)
      stopTimeoutId = null
    }
    if (resetDuration) durationSeconds.value = 0
  }

  const stopStreams = () => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    } catch (_) {}
    stream = null
  }

  const releaseRecorder = () => {
    try {
      if (mediaRecorder?.__listeners) {
        const { onData, onStop, onError } = mediaRecorder.__listeners
        if (onData) mediaRecorder.removeEventListener('dataavailable', onData)
        if (onStop) mediaRecorder.removeEventListener('stop', onStop)
        if (onError) mediaRecorder.removeEventListener('error', onError)
      }
    } catch (_) {}
    mediaRecorder = null
    backendRecorder = null
    nativeRecorderActive = false
  }

  const cleanup = (resetTranscript = false) => {
    clearTimers(false)
    stopStreams()
    if (nativeRecorderActive) {
      Promise.resolve(CapacitorAudioRecorder.cancelRecording()).catch(() => {})
    }
    releaseRecorder()
    recordedChunks = []
    stopRequested = false
    stopHandled = false
    if (resetTranscript) transcript.value = ''
  }

  const setRecorderError = (err, fallbackMessage = 'Voice recording failed') => {
    const details = formatRecorderError(err)
    errorMessage.value = details.message || fallbackMessage
    console.error(`${logPrefix} error`, {
      ...details,
      fallbackMessage,
    })
    state.value = 'error'
  }

  const transcribeBlob = async (blob, fileName = null) => {
    console.log(`${logPrefix} transcription request`, { size: blob?.size, type: blob?.type })
    const fd = new FormData()
    const fallbackExt = inferFileExtFromUri(fileName || '')
    fd.append('file', blob, fileName || inferAudioFilename(blob, fallbackExt))
    const res = await api.post('/transcribe', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    console.log(`${logPrefix} transcription response`, res?.data)
    return res?.data?.text || ''
  }

  const transcribeNativeRecording = async (uri) => {
    const webPath = Capacitor.convertFileSrc(uri)
    console.log(`${logPrefix} native recording file`, { uri, webPath })
    const response = await fetch(webPath)
    if (!response.ok) {
      throw new Error(`Failed to read native recording (${response.status})`)
    }
    const blob = await response.blob()
    console.log(`${logPrefix} native recording blob`, {
      size: blob?.size || 0,
      type: blob?.type || 'unknown',
    })
    if (!blob || blob.size < 1024) {
      const isIosSimulator = Capacitor.getPlatform?.() === 'ios' && /CoreSimulator/i.test(String(uri || ''))
      if (isIosSimulator) {
        throw new Error('No microphone audio was captured in the iOS Simulator. Test on a physical iPhone, or verify Simulator microphone access in macOS privacy settings.')
      }
      throw new Error('No microphone audio was captured. Please try again.')
    }
    return transcribeBlob(blob, `speech.${inferFileExtFromUri(uri)}`)
  }

  const startNativeRecording = async () => {
    await CapacitorAudioRecorder.getPluginVersion()
    const status = await CapacitorAudioRecorder.checkPermissions()
    let permission = status?.recordAudio
    if (permission !== 'granted') {
      const requested = await CapacitorAudioRecorder.requestPermissions()
      permission = requested?.recordAudio
    }
    if (permission !== 'granted') {
      throw new Error('Microphone permission not granted')
    }

    await CapacitorAudioRecorder.startRecording({
      sampleRate: 44100,
      bitRate: 128000,
      audioSessionMode: AudioSessionMode.SpokenAudio,
      audioSessionCategoryOptions: [
        AudioSessionCategoryOption.DefaultToSpeaker,
      ],
    })

    nativeRecorderActive = true
    state.value = 'recording'
    console.log(`${logPrefix} native recording started`, {
      platform: Capacitor.getPlatform?.() || 'native',
    })
    tickId = window.setInterval(() => (durationSeconds.value += 1), 1000)
    if (autoStopMs > 0) autoStopId = window.setTimeout(() => stopRecording('auto'), autoStopMs)
  }

  const startFallbackRecorder = async () => {
    backendRecorder = await recordAndSendToBackend(async (text, isFinal) => {
      if (!text) return
      transcript.value = text
      if (isFinal) {
        state.value = 'done'
        if (typeof onTranscription === 'function') await onTranscription(text)
      }
    })
    state.value = 'recording'
    tickId = window.setInterval(() => (durationSeconds.value += 1), 1000)
    if (autoStopMs > 0) autoStopId = window.setTimeout(() => stopRecording('auto'), autoStopMs)
  }

  const startRecording = async () => {
    if (isRecording.value || isTranscribing.value) return
    cleanup(false)
    transcript.value = ''
    durationSeconds.value = 0
    errorMessage.value = ''
    stopRequested = false
    stopHandled = false

    if (canUseNativeAudioRecorder()) {
      try {
        await startNativeRecording()
        return
      } catch (nativeError) {
        const details = formatRecorderError(nativeError)
        console.warn(`${logPrefix} native recorder start failed`, details)
        console.error(`${logPrefix} start failed`, new Error(details.message || 'Native voice recording failed'))
        errorMessage.value = details.message || 'Native voice recording failed'
        state.value = 'error'
        return
      }
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) throw new Error('Microphone unavailable')
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      recordedChunks = []

      mediaRecorder = new MediaRecorder(stream, { mimeType })

      const onData = (event) => {
        if (event?.data?.size) recordedChunks.push(event.data)
      }
      const onStop = () => finalize('onstop')
      const onError = (evt) => {
        console.warn(`${logPrefix} recorder error`, evt?.error || evt)
        finalize('error')
      }

      mediaRecorder.addEventListener('dataavailable', onData)
      mediaRecorder.addEventListener('stop', onStop)
      mediaRecorder.addEventListener('error', onError)
      mediaRecorder.__listeners = { onData, onStop, onError }

      mediaRecorder.start(1000)
      state.value = 'recording'
      console.log(`${logPrefix} recording started`, { mimeType })
      tickId = window.setInterval(() => (durationSeconds.value += 1), 1000)
      if (autoStopMs > 0) autoStopId = window.setTimeout(() => stopRecording('auto'), autoStopMs)
    } catch (err) {
      console.warn(`${logPrefix} browser recorder unavailable`, formatRecorderError(err))
      stopStreams()
      if (!canUseBrowserAudioCapture()) {
        console.error(`${logPrefix} start failed`, new Error('Voice recording is not available on this device'))
        errorMessage.value = 'Voice recording is not available on this device'
        state.value = 'error'
        return
      }
      try {
        await startFallbackRecorder()
        console.log(`${logPrefix} fallback recorder active`)
      } catch (fallbackError) {
        console.error(`${logPrefix} start failed`, fallbackError)
        errorMessage.value = formatRecorderError(fallbackError).message || 'Voice recording failed'
        state.value = 'error'
        return
      }
    }
  }

  const finalize = async (trigger) => {
    if (stopHandled) return
    stopHandled = true
    clearTimers()
    stopStreams()

    try {
      if (backendRecorder) {
        // Callback will set transcript/state; ensure recorder cleared
        backendRecorder = null
        return
      }

      if (!recordedChunks.length) {
        console.warn(`${logPrefix} no audio captured; resetting`)
        state.value = 'idle'
        return
      }

      const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
      const text = await transcribeBlob(blob)
      transcript.value = text
      state.value = text ? 'done' : 'idle'
      if (text && typeof onTranscription === 'function') await onTranscription(text)
    } catch (err) {
      setRecorderError(err, 'Transcription failed')
      return
    } finally {
      releaseRecorder()
    }
  }

  const stopRecording = async (reason = 'user') => {
    if (stopRequested) return
    if (!isRecording.value && state.value !== 'recording') return
    stopRequested = true
    state.value = 'transcribing'
    clearTimers()
    console.log(`${logPrefix} stop requested`, { reason })

    try {
      if (nativeRecorderActive) {
        const result = await CapacitorAudioRecorder.stopRecording()
        nativeRecorderActive = false
        stopHandled = true
        const uri = result?.uri
        if (!uri) {
          throw new Error('Native recording did not produce a file')
        }
        const text = await transcribeNativeRecording(uri)
        transcript.value = text
        state.value = text ? 'done' : 'idle'
        if (text && typeof onTranscription === 'function') await onTranscription(text)
        return
      }

      if (backendRecorder && typeof backendRecorder._stop === 'function') {
        await backendRecorder._stop()
        stopHandled = true
        stopStreams()
        backendRecorder = null
        return
      }

      if (mediaRecorder) {
        if (mediaRecorder.state !== 'inactive') {
          try {
            if (typeof mediaRecorder.requestData === 'function') mediaRecorder.requestData()
          } catch (_) {}
          mediaRecorder.stop()
          stopTimeoutId = window.setTimeout(() => finalize('timeout'), STOP_FALLBACK_MS)
        } else {
          await finalize('inactive')
        }
      } else {
        await finalize('missing')
      }
    } catch (err) {
      const details = formatRecorderError(err)
      console.error(`${logPrefix} stop failed`, details)
      releaseRecorder()
      stopStreams()
      clearTimers()
      stopRequested = false
      stopHandled = false
      setRecorderError(err, 'Stopping the recording failed')
    }
  }

  const resetRecorder = () => {
    cleanup(true)
    state.value = 'idle'
    durationSeconds.value = 0
  }

  onBeforeUnmount(() => {
    cleanup(false)
  })

  return {
    startRecording,
    stopRecording,
    resetRecorder,
    state,
    transcript,
    durationSeconds,
    errorMessage,
    isRecording,
    isTranscribing,
  }
}
