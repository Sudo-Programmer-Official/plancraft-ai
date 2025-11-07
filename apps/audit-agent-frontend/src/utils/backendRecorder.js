import RecordRTC from "recordrtc"
import api from '@/services/api'

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
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const mimeType = "audio/webm;codecs=opus" // force stable type
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

  const recorder = new RecordRTC(stream, {
    type: "audio",
    mimeType,
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
        if (data?.text) await invokeCallback(data.text, false) // partial result
      } catch (err) {
        console.warn("⚠️ Live transcription failed", err)
      }
    },
  })

  recorder.startRecording()

  // 🔹 Finalizer
  let stopped = false
  recorder._stop = ({ skipFinalUpload = false } = {}) =>
    new Promise((resolve) => {
      if (stopped) {
        resolve()
        return
      }
      stopped = true
      recorder.stopRecording(async () => {
        try {
          const shouldSendFinal = !skipFinalUpload && emitFinalResult
          if (shouldSendFinal) {
            const blob = recorder.getBlob()
            try {
              const fd = new FormData()
              fd.append("file", blob, `speech.${ext}`)
              const res = await api.post("/transcribe", fd, {
                headers: { "Content-Type": "multipart/form-data" },
              })
              const data = res?.data || {}
              if (data?.text) await invokeCallback(data.text, true) // final result
            } catch (err) {
              console.error("❌ Final transcription failed", err)
            }
          }
        } finally {
          stream.getTracks().forEach((t) => t.stop())
          resolve()
        }
      })
    })

  return recorder
}
