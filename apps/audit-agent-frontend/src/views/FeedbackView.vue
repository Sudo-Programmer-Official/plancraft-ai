<template>
  <div class="marketing-light min-h-screen bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 text-slate-900">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <header class="space-y-2">
        <p class="text-xs uppercase tracking-[0.35em] text-indigo-300">Feedback</p>
        <h1 class="text-3xl sm:text-4xl font-bold">Tell us what’s working and what’s not</h1>
        <p class="text-indigo-200 max-w-2xl">
          Help us keep PlanCraftAI calm and useful. Share a quick note, screenshot, or a short voice clip.
        </p>
      </header>

      <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-xl space-y-6">
        <div class="grid gap-4">
          <label class="space-y-2">
            <span class="text-sm text-indigo-200/80">What’s working well? *</span>
            <textarea
              v-model="form.workingWell"
              rows="3"
              class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              placeholder="Tell us what feels good or valuable."
            ></textarea>
          </label>
          <label class="space-y-2">
            <span class="text-sm text-indigo-200/80">What’s frustrating or missing?</span>
            <textarea
              v-model="form.frustrating"
              rows="3"
              class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              placeholder="Where can we smooth things out?"
            ></textarea>
          </label>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <label class="space-y-1">
            <span class="text-sm text-indigo-200/80">Name</span>
            <input
              v-model="form.name"
              type="text"
              class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              placeholder="Optional"
            />
          </label>
          <label class="space-y-1">
            <span class="text-sm text-indigo-200/80">Email</span>
            <input
              v-model="form.email"
              type="email"
              class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              placeholder="Optional"
            />
          </label>
          <label class="space-y-1">
            <span class="text-sm text-indigo-200/80">Company / team size</span>
            <input
              v-model="form.company"
              type="text"
              class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              placeholder="Optional (e.g. 8-person startup)"
            />
          </label>
          <label class="space-y-1">
            <span class="text-sm text-indigo-200/80">Team size</span>
            <input
              v-model="form.teamSize"
              type="text"
              class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              placeholder="Optional (e.g. 5-10)"
            />
          </label>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <span class="text-sm text-indigo-200/80">Attach an image (optional)</span>
            <input
              type="file"
              accept="image/*"
              class="block w-full text-sm text-indigo-100 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
              @change="onImageChange"
            />
            <p v-if="imageName" class="text-xs text-indigo-200/70">Selected: {{ imageName }}</p>
          </div>

          <div class="space-y-2">
            <span class="text-sm text-indigo-200/80">Voice note (optional, ~60s)</span>
            <div class="flex flex-wrap items-center gap-2">
              <button
                class="px-4 py-2 rounded-lg bg-white text-indigo-800 font-semibold hover:bg-slate-100 transition disabled:opacity-60"
                :disabled="recording || !canRecord"
                @click="startRecording"
              >
                {{ recording ? 'Recording…' : 'Record' }}
              </button>
              <button
                class="px-4 py-2 rounded-lg border border-white/20 hover:border-white/50 text-sm"
                :disabled="!recording"
                @click="stopRecording"
              >
                Stop
              </button>
              <button
                v-if="audioUrl"
                class="px-4 py-2 rounded-lg border border-white/20 hover:border-white/50 text-sm"
                @click="clearAudio"
              >
                Remove audio
              </button>
            </div>
            <p class="text-xs text-indigo-200/70">
              {{ recording ? 'Recording in progress…' : canRecord ? 'Tap record to leave a quick note.' : 'Voice recording not supported in this browser.' }}
            </p>
            <audio v-if="audioUrl" :src="audioUrl" controls class="w-full mt-2"></audio>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-900/40"
            :disabled="submitting || !form.workingWell.trim()"
            @click="submit"
          >
            {{ submitting ? 'Submitting…' : 'Submit feedback' }}
          </button>
          <p v-if="success" class="text-sm text-emerald-200">Thank you! We received your feedback.</p>
          <p v-if="error" class="text-sm text-rose-200">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { submitFeedback } from '@/services/feedbackService'

const form = ref({
  workingWell: '',
  frustrating: '',
  name: '',
  email: '',
  company: '',
  teamSize: '',
})

const submitting = ref(false)
const success = ref(false)
const error = ref('')
const imageFile = ref(null)
const imageName = ref('')

const recording = ref(false)
const canRecord = ref(false)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const audioBlob = ref(null)
const audioUrl = ref('')

function onImageChange(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  imageFile.value = file
  imageName.value = file.name
}

function clearAudio() {
  audioBlob.value = null
  audioChunks.value = []
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = ''
  }
}

function stopRecordingInternal() {
  try {
    mediaRecorder.value?.stop()
  } catch {}
  recording.value = false
}

async function startRecording() {
  if (!canRecord.value || recording.value) return
  clearAudio()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    mediaRecorder.value = mr
    audioChunks.value = []
    mr.ondataavailable = (e) => {
      if (e.data?.size > 0) audioChunks.value.push(e.data)
    }
    mr.onstop = () => {
      if (audioChunks.value.length) {
        audioBlob.value = new Blob(audioChunks.value, { type: 'audio/webm' })
        audioUrl.value = URL.createObjectURL(audioBlob.value)
      }
      stream.getTracks().forEach((t) => t.stop())
    }
    mr.start()
    recording.value = true
    setTimeout(() => {
      if (recording.value) stopRecordingInternal()
    }, 60 * 1000)
  } catch (err) {
    canRecord.value = false
  }
}

function stopRecording() {
  stopRecordingInternal()
}

onMounted(() => {
  canRecord.value = !!(navigator?.mediaDevices && window?.MediaRecorder)
})

onBeforeUnmount(() => {
  stopRecordingInternal()
  clearAudio()
})

async function submit() {
  if (!form.value.workingWell.trim()) {
    error.value = 'Please share what is working well.'
    return
  }
  submitting.value = true
  error.value = ''
  success.value = false
  try {
    await submitFeedback({
      ...form.value,
      image: imageFile.value,
      audio: audioBlob.value,
    })
    success.value = true
    form.value = {
      workingWell: '',
      frustrating: '',
      name: '',
      email: '',
      company: '',
      teamSize: '',
    }
    imageFile.value = null
    imageName.value = ''
    clearAudio()
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'Failed to send feedback. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>
