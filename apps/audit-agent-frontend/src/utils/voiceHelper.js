// src/utils/voiceHelper.js
// TODO(CODEX): Transcribe voice using Web Speech API
// src/utils/voiceHelper.js
export function useSpeechToText(onResult, onEnd) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    console.warn("⚠️ Web Speech API not supported in this browser.")
    return null
  }

  const recognition = new SpeechRecognition()
  recognition.lang = "en-US"
  recognition.continuous = true
  recognition.interimResults = true

  let finalTranscript = ""

  recognition.onresult = (event) => {
    let interimTranscript = ""
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " "
      } else {
        interimTranscript += transcript
      }
    }
    onResult(finalTranscript.trim() + " " + interimTranscript.trim())
  }

  recognition.onerror = (e) => {
    console.error("🎤 Speech error:", e.error)
  }

  recognition.onend = () => {
    onEnd?.(finalTranscript.trim())
  }

  return recognition
}