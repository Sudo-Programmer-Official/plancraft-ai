import api from '@/services/api'
import { ensureAiConsentOrThrow } from '@/services/aiConsentService'

export async function requestSpeechUrl(text, options = {}) {
  await ensureAiConsentOrThrow({ source: 'tts-generate' })
  const payload = {
    text: typeof text === 'string' ? text : String(text || ''),
  }
  if (options.voice) payload.voice = options.voice
  if (options.model) payload.model = options.model
  if (options.format) payload.format = options.format

  const res = await api.post('/tts/generate', payload)
  return res?.data || {}
}

export function supportsWebSpeech() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speakWithWebSpeech(text, options = {}) {
  if (!supportsWebSpeech()) return false
  const message = String(text || '').trim()
  if (!message) return false

  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(message)
    if (options.lang) utterance.lang = options.lang
    if (options.rate) utterance.rate = options.rate
    if (options.pitch) utterance.pitch = options.pitch
    if (options.volume) utterance.volume = options.volume
    window.speechSynthesis.speak(utterance)
    return true
  } catch (err) {
    console.warn('[TTS] Web Speech synthesis failed', err)
    return false
  }
}
