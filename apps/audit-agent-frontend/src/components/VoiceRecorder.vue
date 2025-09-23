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
        {{ isRecording ? "Stop Recording" : "Start Recording" }}
      </el-button>

      <p class="text-gray-200 text-sm text-center">
        <span v-if="isRecording">🎤 Recording... stop to transcribe</span>
        <span v-else-if="isTranscribing">⏳ Transcribing...</span>
        <span v-else>Tap to start speaking</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { recordAndSendToBackend } from "@/utils/backendRecorder"
import { isMobileBrowser } from "@/utils/deviceHelper"
import { trackEvent } from "@/services/analytics"

const emit = defineEmits(["transcribed"])

const transcript = ref("")
const isRecording = ref(false)
const isTranscribing = ref(false)
let recorder = null

async function toggleRecording() {
  try {
    if (!isRecording.value) {
      // 👉 Start recording
      transcript.value = ""
      isRecording.value = true
      isTranscribing.value = false

      recorder = await recordAndSendToBackend((text, final = false) => {
        transcript.value = text
        emit("transcribed", text)
        if (final) {
          isTranscribing.value = false
        }
      })
    } else {
      // 👉 Stop recording
      isRecording.value = false
      isTranscribing.value = true

      if (recorder && recorder._stop) {
        await recorder._stop() // waits for final transcription
      }

      trackEvent("Voice Transcribed", { length: transcript.value.length })
    }
  } catch (err) {
    console.error("🎤 Recording error:", err)
    isRecording.value = false
    isTranscribing.value = false
  }
}
</script>