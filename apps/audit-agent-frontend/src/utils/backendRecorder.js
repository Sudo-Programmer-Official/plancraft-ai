import RecordRTC from "recordrtc"

// ✅ Normalize API_BASE so we never accidentally hit /api/ai/transcribe
let __rawBase =
  import.meta.env.VITE_TRANSCRIBE_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:4000/api"

__rawBase = (__rawBase || "").replace(/\/+$/, "") // strip trailing slashes
if (/\/api\/ai$/i.test(__rawBase)) {
  __rawBase = __rawBase.replace(/\/api\/ai$/i, "/api")
}
const API_BASE = __rawBase

function getExt(mime) {
  if (!mime) return "wav"
  if (mime.includes("mp4")) return "m4a"
  if (mime.includes("mpeg")) return "mp3"
  if (mime.includes("aac")) return "aac"
  if (mime.includes("wav")) return "wav"
  return "webm"
}

export async function recordAndSendToBackend(onResult, { timeSliceMs = 4000 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const mimeType =
    RecordRTC.getFromSupportedMimeTypes?.([
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
    ]) || "audio/webm"

  const ext = getExt(mimeType)

  // const recorder = new RecordRTC(stream, {
  //   type: "audio",
  //   mimeType,
  //   timeSlice: timeSliceMs,
  //   ondataavailable: async (blob) => {
  //     if (blob.size < 2048) return
  //     try {
  //       const fd = new FormData()
  //       fd.append("file", blob, `chunk.${ext}`)
  //       const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd })
  //       const data = await res.json()
  //       if (data?.text) onResult(data.text, false) // partial
  //     } catch (err) {
  //       console.warn("⚠️ Live transcription failed", err)
  //     }
  //   },
  // })
  const recorder = new RecordRTC(stream, {
  type: "audio",
  mimeType: "audio/webm;codecs=opus",  // ✅ force webm instead of ogg
  timeSlice: 4000,
  ondataavailable: async (blob) => {
    if (blob.size < 500) return
    try {
      const fd = new FormData()
      fd.append("file", blob, "chunk.webm")
      const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd })
      const data = await res.json()
      if (data?.text) onResult(data.text, false)
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
        const blob = recorder.getBlob()
        try {
          const fd = new FormData()
          fd.append("file", blob, `speech.${ext}`)
          const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd })
          const data = await res.json()
          if (data?.text) onResult(data.text, true) // final
        } catch (err) {
          console.error("❌ Final transcription failed", err)
        } finally {
          stream.getTracks().forEach((t) => t.stop())
          resolve()
        }
      })
    })

  return recorder
}