import RecordRTC from "recordrtc"

// ✅ Normalize API_BASE
let __rawBase =
  import.meta.env.VITE_TRANSCRIBE_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:4000/api"

__rawBase = (__rawBase || "").replace(/\/+$/, "")
if (/\/api\/ai$/i.test(__rawBase)) {
  __rawBase = __rawBase.replace(/\/api\/ai$/i, "/api")
}
const API_BASE = __rawBase

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
  { timeSliceMs = 4000, mode = "final" } = {}
) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const mimeType = "audio/webm;codecs=opus" // force stable type
  const ext = getExt(mimeType)

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
        const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd })
        const data = await res.json()
        if (data?.text) onResult(data.text, false) // partial result
      } catch (err) {
        console.warn("⚠️ Live transcription failed", err)
      }
    },
  })

  recorder.startRecording()

  // 🔹 Finalizer
  recorder._stop = () =>
    new Promise((resolve) => {
      recorder.stopRecording(async () => {
        if (mode === "final") {
          const blob = recorder.getBlob()
          try {
            const fd = new FormData()
            fd.append("file", blob, `speech.${ext}`)
            const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd })
            const data = await res.json()
            if (data?.text) onResult(data.text, true) // final result
          } catch (err) {
            console.error("❌ Final transcription failed", err)
          }
        }
        stream.getTracks().forEach((t) => t.stop())
        resolve()
      })
    })

  return recorder
}