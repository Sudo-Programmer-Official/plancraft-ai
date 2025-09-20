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
      {{ (isRecording ? '🎤 Listening...' : 'Tap to start speaking') }}
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSpeechToText } from '@/utils/voiceHelper'
import { recordAndSendToBackend } from '@/utils/backendRecorder'

const emit = defineEmits(['transcribed'])

const transcript = ref("")
const isRecording = ref(false)
let recognition = null
let mediaRecorder = null

function toggleRecording() {
  if (!isRecording.value) {
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
    else {
      recordAndSendToBackend((text) => {
        transcript.value = text
        emit('transcribed', text)
      }).then((rec) => (mediaRecorder = rec))
    }

    isRecording.value = true
  } else {
    if (recognition) recognition.stop()
    if (mediaRecorder) mediaRecorder.stop()
    isRecording.value = false
  }
}
</script>