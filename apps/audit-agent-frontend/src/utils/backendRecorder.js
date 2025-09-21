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

// function pickAudioMime() {
//   const candidates = [
//     'audio/webm;codecs=opus', // Android Chrome
//     'audio/webm',
//     'audio/mp4',              // iOS Safari
//     'audio/mpeg',             // safari fallback -> mp3
//     'audio/aac'
//   ]
//   return candidates.find(t => window.MediaRecorder?.isTypeSupported?.(t)) || ''
// }
// function pickAudioMime() {
//   if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
//     return "audio/webm;codecs=opus"; // ✅ best choice for Chrome/Firefox/Android
//   }
//   if (MediaRecorder.isTypeSupported("audio/webm")) {
//     return "audio/webm";
//   }
//   if (MediaRecorder.isTypeSupported("audio/mp4")) {
//     return "audio/mp4"; // ✅ fallback for iOS Safari
//   }
//   return "audio/wav"; // ✅ final fallback, universally accepted
// }
function pickAudioMime() {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "audio/wav";
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

  // mediaRecorder.ondataavailable = (e) => {
  //   if (e.data?.size) {
  //     chunks.push(e.data)
  //     // queue for live transcription
  //     liveQueue.push(e.data)
  //     maybeUploadNext()
  //   }
  // }
  mediaRecorder.ondataavailable = (e) => {
  if (e.data?.size > 1024) { // ignore <1KB
    chunks.push(e.data)
    liveQueue.push(e.data)
    maybeUploadNext()
    }
  }

  // async function maybeUploadNext() {
  //   if (busy || stopped) return
  //   const next = liveQueue.shift()
  //   if (!next) return
  //   busy = true
  //   try {
  //     const type = mimeType || 'audio/webm'
  //     // const ext = type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : type.includes('aac') ? 'aac' : 'webm'
  //     const ext = type.includes('mp4')
  // ? 'm4a'
  // : type.includes('mpeg')
  //   ? 'mp3'
  //   : type.includes('aac')
  //     ? 'aac'
  //     : type.includes('wav')
  //       ? 'wav'
  //       : 'webm'
  //     const fd = new FormData()
  //     fd.append('file', next, `chunk.${ext}`)
  //     const res = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: fd })
  //     const data = await res.json()
  //     if (data?.text) {
  //       // append partials progressively
  //       partialText = `${(partialText + ' ' + data.text).trim()}`
  //       onResult(partialText)
  //     }
  //   } catch (err) {
  //     console.warn('⚠️ Live transcription failed (continuing):', err)
  //   } finally {
  //     busy = false
  //     if (liveQueue.length && !stopped) maybeUploadNext()
  //   }
  // }
  async function maybeUploadNext() {
    if (busy || stopped) return
    const next = liveQueue.shift()
    if (!next) return

    // 🚫 Skip empty/tiny blobs (<1KB)
    if (next.size < 1024) {
      if (liveQueue.length && !stopped) maybeUploadNext()
      return
    }

    busy = true
    try {
      const type = mimeType || 'audio/webm'
      const ext =
        type.includes('mp4') ? 'm4a' :
        type.includes('mpeg') ? 'mp3' :
        type.includes('aac') ? 'aac' :
        type.includes('wav') ? 'wav' :
        'webm'

      // ✅ Re-wrap chunk with explicit type to match extension
      const blob = new Blob([next], { type })
      const fd = new FormData()
      fd.append('file', blob, `chunk.${ext}`)

      const res = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: fd })
      const data = await res.json()

      if (data?.text) {
        partialText = `${(partialText + ' ' + data.text).trim()}`
        onResult(partialText)
      }
    } catch (err) {
      if (err?.status === 400 && /Invalid file format/.test(err.message)) {
        console.debug("⚠️ Skipping invalid partial chunk (expected).")
      } else {
        console.warn("⚠️ Live transcription failed:", err)
      }
    } finally {
      busy = false
      if (liveQueue.length && !stopped) maybeUploadNext()
    }
  }
  function getExtensionFromMime(type) {
  if (!type) return 'wav'
  if (type.includes('mp4')) return 'm4a'
  if (type.includes('mpeg')) return 'mp3'
  if (type.includes('aac')) return 'aac'
  if (type.includes('wav')) return 'wav'
  if (type.includes('webm')) return 'webm'
  return 'wav' // ✅ final safety net
}

mediaRecorder.onstop = async () => {
  try {
    stopped = true

    const type = mimeType || 'audio/wav'   // ✅ default to wav if browser didn’t give us one
    const ext = getExtensionFromMime(type)

    // wrap blob with matching mimetype + extension
    const blob = new Blob(chunks, { type })
    const fd = new FormData()
    fd.append('file', blob, `speech.${ext}`)

    const res = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: fd })
    const data = await res.json()

    if (data?.text) {
      partialText = data.text.trim()
      onResult(partialText)
    } else if (partialText) {
      onResult(partialText) // fallback to partials
    }
  } catch (err) {
    console.error('❌ Backend transcription failed (final):', err)
  } finally {
    stream.getTracks().forEach(t => t.stop()) // ✅ always cleanup
  }
}

  // mediaRecorder.onstop = async () => {
  //   try {
  //     stopped = true
  //     // const type = mimeType || 'audio/webm'
  //     const type = "audio/wav"
  //     // const ext  = type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : type.includes('aac') ? 'aac' : 'webm'
  //     const ext = type.includes('mp4')
  // ? 'm4a'
  // : type.includes('mpeg')
  //   ? 'mp3'
  //   : type.includes('aac')
  //     ? 'aac'
  //     : type.includes('wav')
  //       ? 'wav'
  //       : 'webm'
  //     // const blob = new Blob(chunks, { type })
  //     const blob = new Blob(chunks, { type: `audio/${ext}` })
  //     const fd   = new FormData()
  //     fd.append('file', blob, `speech.${ext}`)

  //     const res  = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: fd })
  //     const data = await res.json()
  //     if (data?.text) {
  //       partialText = data.text.trim()
  //       onResult(partialText)
  //     } else if (partialText) {
  //       // fall back to whatever partials we had
  //       onResult(partialText)
  //     }
  //   } catch (err) {
  //     console.error('❌ Backend transcription failed:', err)
  //   } finally {
  //     // release mic
  //     stream.getTracks().forEach(t => t.stop())
  //   }
  // }

  // start and collect until user presses stop
  mediaRecorder.start(timeSliceMs) // get periodic chunks for live text
  return mediaRecorder
}
