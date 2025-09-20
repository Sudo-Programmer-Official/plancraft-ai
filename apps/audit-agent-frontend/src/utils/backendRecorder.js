export async function recordAndSendToBackend(onResult) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream)

  const chunks = []
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data)

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "audio/webm" })
    const formData = new FormData()
    formData.append("file", blob, "speech.webm")

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (data.text) onResult(data.text)
    } catch (err) {
      console.error("❌ Backend transcription failed:", err)
    }
  }

  mediaRecorder.start()
  return mediaRecorder
}