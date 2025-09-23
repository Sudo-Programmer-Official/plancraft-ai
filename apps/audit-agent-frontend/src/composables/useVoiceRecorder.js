// src/composables/useVoiceRecorder.js
import { ref } from "vue"
import { recordAndSendToBackend } from "@/utils/backendRecorder"

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function useVoiceRecorder(onTranscription) {
  const isRecording = ref(false)
  const isTranscribing = ref(false)
  let recognition = null
  let mediaRecorder = null

  const startRecording = async () => {
    if (!isMobile()) {
      // ✅ Desktop → try Web Speech API
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
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
        isRecording.value = true
        return
      }
    }

    // 📱 Mobile or unsupported browsers → fallback
    mediaRecorder = await recordAndSendToBackend((text, isFinal) => {
      onTranscription(text)
      if (isFinal) isTranscribing.value = false
    })

    isRecording.value = true
    isTranscribing.value = false
  }

  const stopRecording = async () => {
    if (recognition) {
      recognition.stop()
      isRecording.value = false
    }
    if (mediaRecorder && mediaRecorder._stop) {
      isRecording.value = false
      isTranscribing.value = true
      await mediaRecorder._stop() // ensures final transcript
    }
  }

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  }
}