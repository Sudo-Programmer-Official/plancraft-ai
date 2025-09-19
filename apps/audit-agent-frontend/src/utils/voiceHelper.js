// src/utils/voiceHelper.js
// TODO(CODEX): Transcribe voice using Web Speech API
export function useSpeechToText(onResult, onEnd) {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
  recognition.lang = 'en-US'
  recognition.continuous = false
  recognition.interimResults = false

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    onResult(transcript)
  }

  recognition.onerror = (e) => {
    console.error('Speech error', e)
    onResult('')
  }

  recognition.onend = onEnd

  return recognition
}