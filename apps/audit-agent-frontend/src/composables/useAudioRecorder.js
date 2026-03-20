import { computed, onBeforeUnmount, ref } from 'vue'
import { Capacitor, registerPlugin } from '@capacitor/core'
import {
  AudioSessionCategoryOption,
  AudioSessionMode,
  CapacitorAudioRecorder,
} from '@capgo/capacitor-audio-recorder'
import api from '@/services/api'
import { recordAndSendToBackend } from '@/utils/backendRecorder'

const MAX_DURATION_MS = 60_000
const STOP_FALLBACK_MS = 1_800
const NATIVE_STOP_TIMEOUT_MS = 8_000
const MINIMUM_AUDIO_BYTES = 1_024
const MINIMUM_RECORDING_SECONDS = 1
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm']
const BASE64_DECODE_CHUNK_SIZE = 8_192

const NativeFileReader = registerPlugin('NativeFileReader')

function canUseBrowserAudioCapture() {
  return !!navigator?.mediaDevices?.getUserMedia
}

function canUseNativeAudioRecorder() {
  return !!Capacitor?.isNativePlatform?.()
}

function getPlatformName() {
  return Capacitor.getPlatform?.() || 'web'
}

function prefersNativeAudioRecorder() {
  return canUseNativeAudioRecorder()
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

function mimeTypeForExtension(ext) {
  switch (String(ext || '').toLowerCase()) {
    case 'm4a':
      return 'audio/x-m4a'
    case 'mp4':
      return 'audio/mp4'
    case 'aac':
      return 'audio/aac'
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'webm':
      return 'audio/webm'
    case 'ogg':
    case 'oga':
      return 'audio/ogg'
    case 'flac':
      return 'audio/flac'
    default:
      return ''
  }
}

function normalizeNativeMimeType(mimeType, filePath = '') {
  const ext = inferFileExtFromUri(filePath)
  const extMimeType = mimeTypeForExtension(ext)
  const cleanedMimeType = String(mimeType || '').split(';')[0].trim().toLowerCase()

  if (!extMimeType) {
    return cleanedMimeType || mimeType || 'application/octet-stream'
  }

  if (!cleanedMimeType || cleanedMimeType === 'application/octet-stream') {
    return extMimeType
  }

  if (ext === 'm4a' && cleanedMimeType === 'audio/mpeg') {
    return extMimeType
  }

  return cleanedMimeType
}

function isIosSimulatorUri(uri) {
  return Capacitor.getPlatform?.() === 'ios' && /CoreSimulator/i.test(String(uri || ''))
}

function createRecorderError(message, code = null) {
  const error = new Error(message)
  if (code) error.code = code
  return error
}

function isExpectedRecorderError(error) {
  return ['no_audio_captured', 'audio_too_short', 'no_speech'].includes(String(error?.code || ''))
}

function stringifyLogPayload(payload) {
  try {
    return JSON.stringify(payload)
  } catch {
    return String(payload)
  }
}

function buildNoAudioCapturedError(uri, duration = 0) {
  if (isIosSimulatorUri(uri)) {
    return createRecorderError(
      'No microphone audio was captured in the iOS Simulator. Test on a physical iPhone, or verify Simulator microphone access in macOS privacy settings.',
      'no_audio_captured',
    )
  }
  if (Number(duration || 0) <= 0) {
    return createRecorderError(
      'No microphone audio was captured. Hold the record button a little longer and try again.',
      'no_audio_captured',
    )
  }
  return createRecorderError('No microphone audio was captured. Please try again.', 'no_audio_captured')
}

function buildShortRecordingError() {
  return createRecorderError(
    'Recording too short. Hold the mic for at least a second and try again.',
    'audio_too_short',
  )
}

function buildEmptyTranscriptError() {
  return createRecorderError(
    'We could not detect any speech in that recording. Try again in a quieter place or speak for a little longer.',
    'no_speech',
  )
}

function sanitizeTranscriptText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const meaningful = text.replace(/[^\p{L}\p{N}]+/gu, '')
  return meaningful ? text : ''
}

function decodeBase64ToBlob(base64, mimeType = 'application/octet-stream') {
  const sanitized = String(base64 || '').trim()
  if (!sanitized) {
    throw new Error('Native file reader returned empty data')
  }
  const binary = atob(sanitized)
  const totalLength = binary.length
  const chunks = []

  for (let offset = 0; offset < totalLength; offset += BASE64_DECODE_CHUNK_SIZE) {
    const slice = binary.slice(offset, offset + BASE64_DECODE_CHUNK_SIZE)
    const bytes = new Uint8Array(slice.length)
    for (let idx = 0; idx < slice.length; idx += 1) {
      bytes[idx] = slice.charCodeAt(idx)
    }
    chunks.push(bytes)
  }

  return new Blob(chunks, { type: mimeType || 'application/octet-stream' })
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
  let nativeStopPending = false
  let activeRecorderStrategy = 'none'
  let nativeStopListenerHandle = null
  let nativeErrorListenerHandle = null
  let nativeStopEventPromise = null
  let nativeStopEventResolve = null
  let nativeStopEventReject = null

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
    nativeStopPending = false
    activeRecorderStrategy = 'none'
  }

  const resetNativeStopEvent = () => {
    nativeStopEventPromise = new Promise((resolve, reject) => {
      nativeStopEventResolve = resolve
      nativeStopEventReject = reject
    })
  }

  const clearNativeStopEvent = () => {
    nativeStopEventPromise = null
    nativeStopEventResolve = null
    nativeStopEventReject = null
  }

  const ensureNativeRecorderListeners = async () => {
    if (!canUseNativeAudioRecorder()) return

    if (!nativeStopListenerHandle) {
      nativeStopListenerHandle = await CapacitorAudioRecorder.addListener('recordingStopped', (event) => {
        console.log(`${logPrefix} native stop event received ${stringifyLogPayload({
          uri: event?.uri || '',
          duration: Number(event?.duration || 0),
        })}`)
        if (typeof nativeStopEventResolve === 'function') {
          nativeStopEventResolve(event || {})
        }
      })
    }

    if (!nativeErrorListenerHandle) {
      nativeErrorListenerHandle = await CapacitorAudioRecorder.addListener('recordingError', (event) => {
        console.warn(`${logPrefix} native recorder error event ${stringifyLogPayload(event || {})}`)
        if (typeof nativeStopEventReject === 'function') {
          nativeStopEventReject(new Error(event?.message || 'Native recorder error'))
        }
      })
    }
  }

  const removeNativeRecorderListeners = async () => {
    try {
      await nativeStopListenerHandle?.remove?.()
    } catch (_) {}
    try {
      await nativeErrorListenerHandle?.remove?.()
    } catch (_) {}
    nativeStopListenerHandle = null
    nativeErrorListenerHandle = null
    clearNativeStopEvent()
  }

  const validateNativeStopResult = (result) => {
    const uri = result?.uri
    if (!uri) {
      throw new Error('Native recording did not produce a file')
    }
    return result
  }

  const waitForNativeStopResult = async () => {
    const attempts = [
      Promise.resolve(CapacitorAudioRecorder.stopRecording()).then((result) => {
        console.log(`${logPrefix} native stop promise resolved ${stringifyLogPayload({
          uri: result?.uri || '',
          duration: Number(result?.duration || 0),
        })}`)
        return validateNativeStopResult(result)
      }),
    ]

    if (nativeStopEventPromise) {
      attempts.push(
        nativeStopEventPromise.then((result) => validateNativeStopResult(result))
      )
    }

    let timeoutId = null
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error(`Native recording stop timed out after ${NATIVE_STOP_TIMEOUT_MS}ms`))
      }, NATIVE_STOP_TIMEOUT_MS)
    })

    try {
      if (typeof Promise.any === 'function') {
        return await Promise.race([Promise.any(attempts), timeoutPromise])
      }

      return await Promise.race([
        Promise.allSettled(attempts).then((results) => {
          for (const result of results) {
            if (result.status === 'fulfilled') return result.value
          }
          throw results.find((result) => result.status === 'rejected')?.reason || new Error('Native recording stop failed')
        }),
        timeoutPromise,
      ])
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId)
      clearNativeStopEvent()
    }
  }

  const cleanup = (resetTranscript = false) => {
    clearTimers(false)
    stopStreams()
    if (nativeRecorderActive && !nativeStopPending) {
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
    const logger = isExpectedRecorderError(err) ? console.warn : console.error
    logger(`${logPrefix} error ${stringifyLogPayload({
      ...details,
      fallbackMessage,
    })}`)
    state.value = 'error'
  }

  const transcribeBlob = async (blob, fileName = null) => {
    console.log(`${logPrefix} transcription request ${stringifyLogPayload({ size: blob?.size, type: blob?.type, fileName })}`)
    const fd = new FormData()
    const fallbackExt = inferFileExtFromUri(fileName || '')
    fd.append('file', blob, fileName || inferAudioFilename(blob, fallbackExt))
    const res = await api.post('/transcribe', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const payload = res?.data || {}
    console.log(`${logPrefix} transcription response ${stringifyLogPayload(payload)}`)
    if (payload?.skipped && payload?.reason === 'audio_too_short') {
      throw buildShortRecordingError()
    }
    if (payload?.skipped && payload?.reason === 'no_speech') {
      throw buildEmptyTranscriptError()
    }
    const text = sanitizeTranscriptText(payload?.text || payload?.transcript || '')
    if (!text) {
      throw buildEmptyTranscriptError()
    }
    return text
  }

  const readBlobWithXhr = (src) => new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', src, true)
      xhr.responseType = 'blob'
      xhr.onload = () => {
        const status = Number(xhr.status || 0)
        const blob = xhr.response
        if ((status >= 200 && status < 300) || (status === 0 && blob)) {
          resolve({ blob, status, reader: 'xhr', src })
          return
        }
        reject(new Error(`Failed to read native recording (${status})`))
      }
      xhr.onerror = () => reject(new Error('Failed to read native recording (xhr)'))
      xhr.send()
    } catch (error) {
      reject(error)
    }
  })

  const readBlobWithFetch = async (src) => {
    const response = await fetch(src)
    const blob = await response.blob()
    const status = Number(response?.status || 0)
    if (response.ok || (status === 0 && blob)) {
      return { blob, status, reader: 'fetch', src }
    }
    throw new Error(`Failed to read native recording (${status})`)
  }

  const readBlobWithNativePlugin = async (uri) => {
    if (getPlatformName() !== 'android' || !uri) {
      throw new Error('Native file reader unavailable')
    }
    const result = await NativeFileReader.readFileBase64({ path: uri })
    const normalizedMimeType = normalizeNativeMimeType(result?.mimeType || '', uri)
    const blob = decodeBase64ToBlob(result?.base64 || '', normalizedMimeType || 'audio/x-m4a')
    return {
      blob,
      status: 200,
      reader: 'native-plugin',
      src: uri,
    }
  }

  const readNativeSource = async (src) => {
    const attempts = []
    if (getPlatformName() === 'android' && /^file:\/\//i.test(String(src || ''))) {
      attempts.push(readBlobWithNativePlugin(src))
    }
    attempts.push(readBlobWithXhr(src), readBlobWithFetch(src))
    let lastError = null

    if (typeof Promise.any === 'function') {
      try {
        const result = await Promise.any(attempts)
        if (result?.blob?.size || Number(result?.status || 0) === 0) {
          return result
        }
      } catch (error) {
        lastError = error?.errors?.[0] || error
      }
    }

    for (const attempt of attempts) {
      try {
        const result = await attempt
        if (result?.blob?.size || Number(result?.status || 0) === 0) {
          return result
        }
    } catch (error) {
      lastError = error
    }
  }

    throw lastError || new Error('Failed to read native recording')
  }

  const readNativeRecordingBlob = async (uri, webPath = null) => {
    const sources = Array.from(new Set([
      webPath,
      uri ? Capacitor.convertFileSrc(uri) : '',
      uri,
    ].filter(Boolean)))

    let lastError = null
    for (const src of sources) {
      try {
        const result = await readNativeSource(src)
        if (result?.blob?.size || Number(result?.status || 0) === 0) return result
      } catch (error) {
        lastError = error
      }
    }

    throw lastError || new Error('Failed to read native recording')
  }

  const transcribeNativeRecording = async ({ uri, webPath = '', duration = 0 } = {}) => {
    const resolvedWebPath = webPath || Capacitor.convertFileSrc(uri)
    console.log(`${logPrefix} native recording file ${stringifyLogPayload({ uri, webPath: resolvedWebPath, duration })}`)
    let blobResult = null
    try {
      blobResult = await readNativeRecordingBlob(uri, resolvedWebPath)
    } catch (error) {
      if (Number(duration || 0) <= 0 || isIosSimulatorUri(uri)) {
        throw buildNoAudioCapturedError(uri, duration)
      }
      throw error
    }
    const { blob, status, reader, src } = blobResult
    const normalizedMimeType = normalizeNativeMimeType(blob?.type || '', uri)
    const normalizedBlob =
      normalizedMimeType && normalizedMimeType !== String(blob?.type || '').toLowerCase()
        ? new Blob([blob], { type: normalizedMimeType })
        : blob
    console.log(`${logPrefix} native recording blob ${stringifyLogPayload({
      size: normalizedBlob?.size || 0,
      type: normalizedBlob?.type || 'unknown',
      originalType: blob?.type || 'unknown',
      status,
      reader,
      src,
    })}`)
    if (!normalizedBlob || normalizedBlob.size < 1024) {
      throw buildNoAudioCapturedError(uri, duration)
    }
    return transcribeBlob(normalizedBlob, `speech.${inferFileExtFromUri(uri)}`)
  }

  const startNativeRecording = async () => {
    await ensureNativeRecorderListeners()
    resetNativeStopEvent()
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
    activeRecorderStrategy = 'native'
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
    activeRecorderStrategy = 'recordrtc'
    state.value = 'recording'
    tickId = window.setInterval(() => (durationSeconds.value += 1), 1000)
    if (autoStopMs > 0) autoStopId = window.setTimeout(() => stopRecording('auto'), autoStopMs)
  }

  const startBrowserRecording = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) throw new Error('Microphone unavailable')
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickMimeType()
    recordedChunks = []

    mediaRecorder = new MediaRecorder(stream, { mimeType })
    activeRecorderStrategy = 'mediarecorder'

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
    console.log(`${logPrefix} recording started`, {
      mimeType,
      platform: getPlatformName(),
      strategy: 'browser',
    })
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
    const platform = getPlatformName()
    const nativePreferred = prefersNativeAudioRecorder()

    if (nativePreferred) {
      try {
        await startNativeRecording()
        return
      } catch (nativeError) {
        const details = formatRecorderError(nativeError)
        console.warn(`${logPrefix} native recorder start failed`, { ...details, platform, strategy: 'native-first' })
        cleanup(false)
        errorMessage.value = details.message || 'Native voice recording failed'
        state.value = 'error'
        return
      }
    }

    if (canUseBrowserAudioCapture()) {
      try {
        await startBrowserRecording()
        return
      } catch (browserError) {
        console.warn(`${logPrefix} browser recorder unavailable`, {
          ...formatRecorderError(browserError),
          platform,
          strategy: nativePreferred ? 'native-then-browser' : 'browser-first',
        })
        cleanup(false)
      }
    }

    if (!nativePreferred && canUseNativeAudioRecorder()) {
      try {
        await startNativeRecording()
        return
      } catch (nativeError) {
        const details = formatRecorderError(nativeError)
        console.warn(`${logPrefix} native recorder fallback failed`, { ...details, platform, strategy: 'browser-then-native' })
        cleanup(false)
      }
    }

    if (canUseBrowserAudioCapture()) {
      try {
        await startFallbackRecorder()
        console.log(`${logPrefix} fallback recorder active`, {
          platform,
          strategy: nativePreferred ? 'native-then-browser-fallback' : 'browser-fallback',
        })
        return
      } catch (fallbackError) {
        console.error(`${logPrefix} fallback recorder failed`, {
          ...formatRecorderError(fallbackError),
          platform,
        })
        cleanup(false)
      }
    }

    const unavailableMessage = nativePreferred
      ? 'Voice recording is unavailable on this device'
      : 'Voice recording failed to start on this device'
    console.error(`${logPrefix} start failed`, new Error(unavailableMessage))
    errorMessage.value = unavailableMessage
    state.value = 'error'
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

      const totalBytes = recordedChunks.reduce((sum, chunk) => sum + Number(chunk?.size || 0), 0)
      console.log(`${logPrefix} finalize`, {
        trigger,
        strategy: activeRecorderStrategy,
        durationSeconds: durationSeconds.value,
        chunkCount: recordedChunks.length,
        chunkBytes: recordedChunks.map((chunk) => Number(chunk?.size || 0)).slice(0, 8),
        totalBytes,
      })
      if (durationSeconds.value < MINIMUM_RECORDING_SECONDS && totalBytes < MINIMUM_AUDIO_BYTES) {
        throw buildShortRecordingError()
      }

      const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
      console.log(`${logPrefix} browser recording blob`, {
        size: blob?.size || 0,
        type: blob?.type || 'unknown',
        strategy: activeRecorderStrategy,
      })
      if (!blob || blob.size < MINIMUM_AUDIO_BYTES) {
        throw buildShortRecordingError()
      }
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
    console.log(`${logPrefix} stop requested ${stringifyLogPayload({ reason })}`)

    try {
      if (nativeRecorderActive) {
        nativeStopPending = true
        const result = await waitForNativeStopResult()
        nativeRecorderActive = false
        nativeStopPending = false
        stopHandled = true
        const text = await transcribeNativeRecording(result)
        transcript.value = text
        state.value = text ? 'done' : 'idle'
        if (text && typeof onTranscription === 'function') await onTranscription(text)
        return
      }

      if (backendRecorder && typeof backendRecorder._stop === 'function') {
        const result = await backendRecorder._stop()
        stopHandled = true
        stopStreams()
        backendRecorder = null
        if (result?.error) {
          throw result.error
        }
        if (!String(result?.transcript || '').trim()) {
          throw buildEmptyTranscriptError()
        }
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
      nativeStopPending = false
      const details = formatRecorderError(err)
      const logger = isExpectedRecorderError(err) ? console.warn : console.error
      logger(`${logPrefix} stop failed ${stringifyLogPayload(details)}`)
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
    Promise.resolve(removeNativeRecorderListeners()).catch(() => {})
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
