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
export async function recordAndSendToBackend(onResult) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  // 🔹 pick correct mimeType for mobile
  const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
    ? "audio/mp4"
    : MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : ""

  const mediaRecorder = new MediaRecorder(stream, { mimeType })
  const chunks = []

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data)

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: mimeType })
    const formData = new FormData()
    formData.append("file", blob, `speech.${mimeType.includes("mp4") ? "mp4" : "webm"}`)

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
      const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: formData })
      const data = await res.json()
      if (data.text) onResult(data.text)
    } catch (err) {
      console.error("❌ Backend transcription failed:", err)
    }
  }

  mediaRecorder.start()
  return mediaRecorder
}