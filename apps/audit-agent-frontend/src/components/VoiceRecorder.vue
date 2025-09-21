<template>
  <div class="bg-gray-900/80 rounded-xl shadow-lg">
    <div class="flex flex-col items-center gap-2">
      <button
        @click="toggleRecording"
        class="px-4 py-2 rounded-lg w-full sm:w-auto"
        :class="isRecording ? 'bg-red-600' : 'bg-indigo-600'"
      >
        {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
      </button>

      <p class="text-gray-200 text-sm text-center">
        <!-- Desktop = live listening, Mobile = recording until stop -->
        {{ isRecording
          ? (forceBackend ? '🎤 Recording... stop to transcribe' : '🎤 Listening...')
          : 'Tap to start speaking' }}
      </p>
    </div>
  </div>
</template>

<!-- <script setup>
import { ref, computed } from 'vue'
import { useSpeechToText } from '@/utils/voiceHelper'
import { recordAndSendToBackend } from '@/utils/backendRecorder'
import { isMobileBrowser } from '@/utils/deviceHelper'

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
//</script> -->
<script setup>
import { ref } from 'vue'
import { useSpeechToText } from '@/utils/voiceHelper'
import { recordAndSendToBackend } from '@/utils/backendRecorder'
import { isMobileBrowser } from '@/utils/deviceHelper'
import { trackEvent } from '@/services/analytics'

const emit = defineEmits(['transcribed'])

const transcript = ref('')
const isRecording = ref(false)
let recognition = null
let mediaRecorder = null

async function toggleRecording() {
  try {
    if (!isRecording.value) {
      // Always stop anything lingering
      recognition?.stop(); mediaRecorder?.stop()

      // Mobile (iOS Safari / Android Chrome) → backend; desktop Chrome/Edge → Web Speech
      const useBackend = isMobileBrowser()

      if (!useBackend) {
        recognition = useSpeechToText(
          t => { transcript.value = t; emit('transcribed', t) },
          t => { transcript.value = t; emit('transcribed', t) }
        )
        if (recognition) recognition.start()
      }

      if (useBackend || !recognition) {
        mediaRecorder = await recordAndSendToBackend(
          t => {
            // Live partials + final
            transcript.value = t
            emit('transcribed', t)
          },
          { timeSliceMs: 2500 }
        )
      }

      isRecording.value = true
    } else {
      recognition?.stop()
      mediaRecorder?.stop()
      try {
        const len = (transcript.value || '').length
        trackEvent('Voice Transcribed', { length: len })
      } catch (e) {
        console.warn('analytics: Voice Transcribed track failed', e)
      }
      isRecording.value = false
    }
  } catch (e) {
    console.error('🎤 start/stop failed:', e)
    recognition?.stop()
    mediaRecorder?.stop()
    isRecording.value = false
  }
}
</script>
