<template>
  <div>
    <div class="flex flex-col items-center gap-2">
      <el-button
        :type="isRecording ? 'danger' : 'primary'"
        @click="toggleRecording"
        class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
         bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600
         hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700
         transition-all duration-200"
      >
        {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
      </el-button>

      <p class="text-gray-200 text-sm text-center">
        <span v-if="isRecording">
          {{ forceBackend ? "🎤 Recording... stop to transcribe" : "🎤 Listening..." }}
        </span>
        <span v-else-if="isTranscribing">
          ⏳ Transcribing...
        </span>
        <span v-else>
          Tap to start speaking
        </span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useSpeechToText } from "@/utils/voiceHelper"
import { recordAndSendToBackend } from "@/utils/backendRecorder"
import { isMobileBrowser } from "@/utils/deviceHelper"
import { trackEvent } from "@/services/analytics"

const emit = defineEmits(["transcribed"])

const transcript = ref("")
const isRecording = ref(false)
const isTranscribing = ref(false) // 👈 new state
let recognition = null
let mediaRecorder = null

async function toggleRecording() {
  try {
    if (!isRecording.value) {
      // Always stop anything lingering
      recognition?.stop()
      mediaRecorder?.stop()

      const useBackend = isMobileBrowser()

      if (!useBackend) {
        recognition = useSpeechToText(
          (t) => {
            transcript.value = t
            emit("transcribed", t)
          },
          (t) => {
            transcript.value = t
            emit("transcribed", t)
          }
        )
        if (recognition) recognition.start()
      }

      if (useBackend || !recognition) {
        mediaRecorder = await recordAndSendToBackend((t) => {
          transcript.value = t
          emit("transcribed", t)
          isTranscribing.value = false // 👈 clear once text is ready
        })
      }

      isRecording.value = true
      isTranscribing.value = false
    } else {
      recognition?.stop()
      mediaRecorder?.stop()
      isRecording.value = false
      isTranscribing.value = true // 👈 show transcribing while waiting

      try {
        const len = (transcript.value || "").length
        trackEvent("Voice Transcribed", { length: len })
      } catch (e) {
        console.warn("analytics: Voice Transcribed track failed", e)
      }
    }
  } catch (e) {
    console.error("🎤 start/stop failed:", e)
    recognition?.stop()
    mediaRecorder?.stop()
    isRecording.value = false
    isTranscribing.value = false
  } finally {
    recognition = null
    mediaRecorder = null
    isTranscribing.value = false // 👈 ensure cleare
  }
}
</script>