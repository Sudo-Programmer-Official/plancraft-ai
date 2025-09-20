// export async function recordAndSendToBackend(onResult) {
//   const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
//   const mediaRecorder = new MediaRecorder(stream)

//   const chunks = []
//   mediaRecorder.ondataavailable = (e) => chunks.push(e.data)

//   mediaRecorder.onstop = async () => {
//     const blob = new Blob(chunks, { type: "audio/webm" })
//     const formData = new FormData()
//     formData.append("file", blob, "speech.webm")

//     try {
//       const res = await fetch("/api/transcribe", {
//         method: "POST",
//         body: formData
//       })
//       const data = await res.json()
//       if (data.text) onResult(data.text)
//     } catch (err) {
//       console.error("❌ Backend transcription failed:", err)
//     }
//   }

//   mediaRecorder.start()
//   return mediaRecorder
// }
// export async function recordAndSendToBackend(onResult) {
//   const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

//   // 🔹 pick correct mimeType for mobile
//   const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
//     ? "audio/mp4"
//     : MediaRecorder.isTypeSupported("audio/webm")
//     ? "audio/webm"
//     : ""

//   const mediaRecorder = new MediaRecorder(stream, { mimeType })
//   const chunks = []

//   mediaRecorder.ondataavailable = (e) => chunks.push(e.data)

//   mediaRecorder.onstop = async () => {
//     const blob = new Blob(chunks, { type: mimeType })
//     const formData = new FormData()
//     formData.append("file", blob, `speech.${mimeType.includes("mp4") ? "mp4" : "webm"}`)

//     try {
//       const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
//       const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: formData })
//       const data = await res.json()
//       if (data.text) onResult(data.text)
//     } catch (err) {
//       console.error("❌ Backend transcription failed:", err)
//     }
//   }

//   mediaRecorder.start()
//   return mediaRecorder
// }

// Derive transcription base. If only VITE_API_BASE_URL is set to /api/ai, map it to /api
(() => {})()
let __rawBase = import.meta.env.VITE_TRANSCRIBE_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
__rawBase = (__rawBase || '').replace(/\/+$/, '')
if (/\/api\/ai$/i.test(__rawBase)) {
  __rawBase = __rawBase.replace(/\/api\/ai$/i, '/api')
}
const API_BASE = __rawBase

function pickAudioMime() {
  const candidates = [
    'audio/webm;codecs=opus', // Android Chrome
    'audio/webm',
    'audio/mp4',              // iOS Safari
    'audio/mpeg',             // safari fallback -> mp3
    'audio/aac'
  ]
  return candidates.find(t => window.MediaRecorder?.isTypeSupported?.(t)) || ''
}

// onResult is called with partials during recording and final on stop
export async function recordAndSendToBackend(onResult, { timeSliceMs = 2500 } = {}) {
  // iOS needs a user gesture — this runs inside a click handler in VoiceRecorder.vue
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    }
  })

  const mimeType = pickAudioMime()
  const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks = []
  const liveQueue = []
  let busy = false
  let stopped = false
  let partialText = ''

  mediaRecorder.ondataavailable = (e) => {
    if (e.data?.size) {
      chunks.push(e.data)
      // queue for live transcription
      liveQueue.push(e.data)
      maybeUploadNext()
    }
  }

  async function maybeUploadNext() {
    if (busy || stopped) return
    const next = liveQueue.shift()
    if (!next) return
    busy = true
    try {
      const type = mimeType || 'audio/webm'
      const ext = type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : type.includes('aac') ? 'aac' : 'webm'
      const fd = new FormData()
      fd.append('file', next, `chunk.${ext}`)
      const res = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data?.text) {
        // append partials progressively
        partialText = `${(partialText + ' ' + data.text).trim()}`
        onResult(partialText)
      }
    } catch (err) {
      console.warn('⚠️ Live transcription failed (continuing):', err)
    } finally {
      busy = false
      if (liveQueue.length && !stopped) maybeUploadNext()
    }
  }

  mediaRecorder.onstop = async () => {
    try {
      stopped = true
      const type = mimeType || 'audio/webm'
      const ext  = type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : type.includes('aac') ? 'aac' : 'webm'
      const blob = new Blob(chunks, { type })
      const fd   = new FormData()
      fd.append('file', blob, `speech.${ext}`)

      const res  = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data?.text) {
        partialText = data.text.trim()
        onResult(partialText)
      } else if (partialText) {
        // fall back to whatever partials we had
        onResult(partialText)
      }
    } catch (err) {
      console.error('❌ Backend transcription failed:', err)
    } finally {
      // release mic
      stream.getTracks().forEach(t => t.stop())
    }
  }

  // start and collect until user presses stop
  mediaRecorder.start(timeSliceMs) // get periodic chunks for live text
  return mediaRecorder
}
