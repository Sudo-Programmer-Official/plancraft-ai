// // src/composables/useVoiceRecorder.js
// import { ref } from 'vue'

// export function useVoiceRecorder(onTranscription) {
//   const isRecording = ref(false)
//   let recognition

//   const startRecording = () => {
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
//     if (!SpeechRecognition) {
//       alert('Speech recognition not supported')
//       return
//     }

//     recognition = new SpeechRecognition()
//     recognition.lang = 'en-US'
//     recognition.continuous = false
//     recognition.interimResults = false

//     recognition.onresult = (e) => {
//       const transcript = e.results[0][0].transcript
//       onTranscription(transcript)
//     }

//     recognition.onend = () => {
//       isRecording.value = false
//     }

//     recognition.onerror = (e) => {
//       console.error('Speech error:', e)
//       isRecording.value = false
//     }

//     recognition.start()
//     isRecording.value = true
//   }

//   const stopRecording = () => {
//     recognition?.stop()
//     isRecording.value = false
//   }

//   return {
//     isRecording,
//     startRecording,
//     stopRecording,
//   }
// }

// src/composables/useVoiceRecorder.js
import { ref } from "vue"

// Helper: detect mobile browsers (iOS/Android)
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// 🔹 Backend fallback (Whisper/Google STT via /api/transcribe)
async function recordAndSendToBackend(onResult) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream)

  const chunks = []
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data)

  // mediaRecorder.onstop = async () => {
  //   const blob = new Blob(chunks, { type: "audio/webm" })
  //   const formData = new FormData()
  //   formData.append("file", blob, "speech.webm")

  //   try {
  //     const res = await fetch("/api/transcribe", {
  //       method: "POST",
  //       body: formData,
  //     })
  //     const data = await res.json()
  //     if (data.text) onResult(data.text)
  //   } catch (err) {
  //     console.error("❌ Backend transcription failed:", err)
  //   }
  // }
  mediaRecorder.onstop = async () => {
  try {
    const type = "audio/wav"  // ✅ Force WAV for compatibility
    const blob = new Blob(chunks, { type })
    const formData = new FormData()
    formData.append("file", blob, "speech.wav") // ✅ use .wav

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
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

export function useVoiceRecorder(onTranscription) {
  const isRecording = ref(false)
  let recognition = null
  let mediaRecorder = null

  const startRecording = async () => {
    if (!isMobile()) {
      // ✅ Desktop → try Web Speech API
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        // alert("Speech recognition not supported in this browser")
        // return
         // Fallback to backend if not supported
        mediaRecorder = await recordAndSendToBackend(onTranscription)
        isRecording.value = true
        return
      }

      recognition = new SpeechRecognition()
      recognition.lang = "en-US"
      recognition.continuous = true
      recognition.interimResults = true

      let finalTranscript = ""

      recognition.onresult = (e) => {
        let interim = ""
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript
          if (e.results[i].isFinal) finalTranscript += transcript + " "
          else interim += transcript
        }
        onTranscription((finalTranscript + " " + interim).trim())
      }

      recognition.onend = () => {
        isRecording.value = false
      }

      recognition.onerror = (e) => {
        console.error("🎤 Speech error:", e.error)
        isRecording.value = false
      }

      recognition.start()
    } else {
      // 📱 Mobile → fallback to backend
      mediaRecorder = await recordAndSendToBackend(onTranscription)
    }

    isRecording.value = true
  }

  const stopRecording = () => {
    if (recognition) recognition.stop()
    if (mediaRecorder) mediaRecorder.stop()
    isRecording.value = false
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
  }
}