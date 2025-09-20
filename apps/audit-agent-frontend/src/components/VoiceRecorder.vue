<template>
  <div class="bg-gray-900/80 rounded-xl p-4 flex items-center gap-3 shadow-lg">
    <button
      @click="toggleRecording"
      class="px-4 py-2 rounded-lg"
      :class="isRecording ? 'bg-red-600' : 'bg-indigo-600'"
    >
      {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
    </button>

    <p class="flex-1 text-gray-200">
      <!-- Desktop = live listening, Mobile = recording until stop -->
      {{ isRecording
        ? (forceBackend ? '🎤 Recording... stop to transcribe' : '🎤 Listening...')
        : 'Tap to start speaking' }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSpeechToText } from '@/utils/voiceHelper'
import { recordAndSendToBackend } from '@/utils/backendRecorder'
import { isMobileBrowser, isSafari } from '@/utils/deviceHelper'

const emit = defineEmits(['transcribed'])

const transcript = ref("")
const isRecording = ref(false)
let recognition = null
let mediaRecorder = null

// ✅ compute once so template can use it
const forceBackend = computed(() => isMobileBrowser() || isSafari())

async function toggleRecording() {
  if (!isRecording.value) {
    if (!forceBackend.value) {
      // Desktop Chrome/Edge → Web Speech API
      recognition = useSpeechToText(
        (text) => {
          transcript.value = text
          emit('transcribed', text)
        },
        (finalText) => {
          transcript.value = finalText
          emit('transcribed', finalText)
        }
      )
      if (recognition) recognition.start()
    }

    if (forceBackend.value || !recognition) {
      // Mobile/iOS Safari/Android → fallback to Whisper backend
      mediaRecorder = await recordAndSendToBackend((text) => {
        transcript.value = text
        emit('transcribed', text)
      })
    }

    isRecording.value = true
  } else {
    if (recognition) {
      recognition.stop()
      recognition = null
    }
    if (mediaRecorder) {
      mediaRecorder.stop()
      mediaRecorder = null
    }
    isRecording.value = false
  }
}
</script>