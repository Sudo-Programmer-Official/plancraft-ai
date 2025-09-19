// src/composables/useVoiceRecorder.js
import { ref } from 'vue'

export function useVoiceRecorder(onTranscription) {
  const isRecording = ref(false)
  let recognition

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition not supported')
      return
    }

    recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onTranscription(transcript)
    }

    recognition.onend = () => {
      isRecording.value = false
    }

    recognition.onerror = (e) => {
      console.error('Speech error:', e)
      isRecording.value = false
    }

    recognition.start()
    isRecording.value = true
  }

  const stopRecording = () => {
    recognition?.stop()
    isRecording.value = false
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
  }
}