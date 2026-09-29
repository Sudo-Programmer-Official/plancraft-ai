import api from '@/services/api'

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/aac",
  "audio/m4a",
  "audio/webm",
]
const VOICE_STOP_DELAY_MS = 400
const MINIMUM_AUDIO_BYTES = 1024
let recordRtcLoader = null

async function loadRecordRTC() {
  if (typeof window === 'undefined') {
    throw new Error('RecordRTC is only available in the browser')
  }

  if (!recordRtcLoader) {
    recordRtcLoader = import('recordrtc').then((module) => module?.default || module)
  }

  return recordRtcLoader
}

function sanitizeTranscriptText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  const meaningful = text.replace(/[^\p{L}\p{N}]+/gu, "")
  return meaningful ? text : ""
}

function getExt(mime) {
  if (!mime) return "wav"
  if (mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a"))
    return "m4a"
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3"
  if (mime.includes("ogg")) return "ogg"
  if (mime.includes("wav")) return "wav"
  if (mime.includes("webm")) return "webm"
  return "webm"
}

function resolveMimeType() {
  const canUse = (type) =>
    (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function"
      ? MediaRecorder.isTypeSupported(type)
      : false)
  try {
    const supported = MIME_CANDIDATES.find((type) => canUse(type))
    return supported || null
  } catch {
    return null
  }
}

function flushInternalRecorder(recorder) {
  const internal =
    (typeof recorder.getInternalRecorder === "function" && recorder.getInternalRecorder()) ||
    recorder.recorder ||
    recorder.internalRecorder
  if (
    internal &&
    typeof internal.requestData === "function" &&
    internal.state !== "inactive"
  ) {
    try {
      internal.requestData()
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {function} onResult - Callback for transcription text
 * @param {object} options
 * @param {number} [options.timeSliceMs=4000] - Chunk duration for live mode
 * @param {"final"|"live"} [options.mode="final"] - Upload strategy
 */
export async function recordAndSendToBackend(
  onResult,
  { timeSliceMs = 4000, mode = "final", emitFinalResult = mode === "final" } = {}
) {
  const RecordRTC = await loadRecordRTC()

  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error("Browser microphone APIs unavailable")
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const mimeType = resolveMimeType()
  const ext = getExt(mimeType)

  const invokeCallback = async (text, isFinal) => {
    if (!text || typeof onResult !== "function") return
    try {
      const maybe = onResult(text, isFinal)
      if (maybe && typeof maybe.then === "function") {
        await maybe
      }
    } catch (err) {
      console.warn("⚠️ Transcription callback failed", err)
    }
  }

  const recorderConfig = {
    type: "audio",
    timeSlice: mode === "live" ? timeSliceMs : null, // only slice in live mode
    ondataavailable: async (blob) => {
      if (mode !== "live") return // ignore chunks in final mode
      if (blob.size < 500) return
      try {
        const fd = new FormData()
        fd.append("file", blob, `chunk.${ext}`)
        const res = await api.post("/transcribe", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        const data = res?.data || {}
        const partialText = sanitizeTranscriptText(data?.text || data?.transcript || "")
        if (partialText) await invokeCallback(partialText, false) // partial result
      } catch (err) {
        console.warn("⚠️ Live transcription failed", err)
      }
    },
  }
  if (mimeType) recorderConfig.mimeType = mimeType

  const recorder = new RecordRTC(stream, recorderConfig)
  // Expose the capture stream to the shared recorder so voice activity detection
  // can observe the same audio without changing the upload/transcription path.
  recorder.__stream = stream

  recorder.startRecording()

  // 🔹 Finalizer
  let stopped = false
  let finalState = {
    transcript: "",
    skipped: false,
    reason: null,
    error: null,
  }
  recorder._stop = ({ skipFinalUpload = false } = {}) =>
    new Promise((resolve) => {
      if (stopped) {
        resolve(finalState)
        return
      }
      stopped = true

      const finalize = async () => {
        flushInternalRecorder(recorder)
        recorder.stopRecording(async () => {
          try {
            const shouldSendFinal = !skipFinalUpload && emitFinalResult
            if (shouldSendFinal) {
              const blob = recorder.getBlob()
              console.log("[backendRecorder] final blob", {
                size: blob?.size || 0,
                type: blob?.type || "unknown",
                ext,
              })
              if (!blob || blob.size < MINIMUM_AUDIO_BYTES) {
                finalState = {
                  transcript: "",
                  skipped: true,
                  reason: "audio_too_short",
                  error: new Error("Recording too short. Hold the mic for at least a second and try again."),
                }
                return
              }
              try {
                const fd = new FormData()
                fd.append("file", blob, `speech.${ext}`)
                const res = await api.post("/transcribe", fd, {
                  headers: { "Content-Type": "multipart/form-data" },
                })
                const data = res?.data || {}
                finalState = {
                  transcript: sanitizeTranscriptText(data?.text || data?.transcript || ""),
                  skipped: !!data?.skipped,
                  reason: data?.reason || null,
                  error: null,
                }
                if (finalState.skipped && finalState.reason === "audio_too_short") {
                  finalState.error = new Error("Recording too short. Hold the mic for at least a second and try again.")
                  return
                }
                if (finalState.skipped && finalState.reason === "no_speech") {
                  finalState.error = new Error("We could not detect any speech in that recording. Try again in a quieter place or speak for a little longer.")
                  return
                }
                if (finalState.transcript) {
                  await invokeCallback(finalState.transcript, true) // final result
                } else {
                  finalState.error = new Error("Transcription returned empty text")
                }
              } catch (err) {
                finalState.error = err
                console.error("❌ Final transcription failed", err)
              }
            }
          } finally {
            stream.getTracks().forEach((t) => t.stop())
            resolve(finalState)
          }
        })
      }

      if (VOICE_STOP_DELAY_MS > 0) {
        setTimeout(finalize, VOICE_STOP_DELAY_MS)
      } else {
        finalize()
      }
    })

  return recorder
}
