<template>
  <div
    class="relative min-h-screen flex flex-col items-center justify-center text-center text-white overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900"
  >
    <!-- Shooting stars background -->
    <canvas ref="starsCanvas" class="absolute inset-0 w-full h-full"></canvas>

    <!-- Content -->
    <div
      class="relative z-10 max-w-lg mx-auto p-8 rounded-2xl bg-gray-900/50 backdrop-blur-xl shadow-xl"
    >
      <h1 class="text-4xl font-bold mb-4 animate-fade-in">☀️ Good Morning!</h1>
      <p class="text-indigo-200 mb-8 animate-fade-in-delay">
        Let’s plan your day — just speak, and we’ll do the rest.
      </p>

      <!-- Mic / Recorder -->
      <div class="flex flex-col items-center gap-6">
        <div
          class="relative w-40 h-40 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition overflow-hidden"
          :class="isRecording
            ? 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 ring-4 ring-sky-300/40'
            : 'bg-indigo-600 hover:bg-indigo-700'"
          @click="toggleRecording"
        >
          <!-- Ripple animation -->
          <span
            v-if="isRecording"
            class="absolute inset-0 rounded-full bg-sky-400/20 animate-ripple"
          ></span>
          <span
            v-if="isRecording"
            class="absolute inset-0 rounded-full bg-sky-300/20 animate-ripple delay-300"
          ></span>
          <span
            v-if="isRecording"
            class="absolute inset-0 rounded-full bg-sky-200/20 animate-ripple delay-600"
          ></span>

          <!-- Waveform -->
          <canvas
            v-show="isRecording"
            ref="waveCanvas"
            class="absolute inset-0 w-full h-full rounded-full"
          ></canvas>

          <!-- Mic Icon / Text -->
          <span v-if="!isRecording" class="text-5xl z-10">🎤</span>
          <span v-else class="text-lg font-semibold z-10">Recording...</span>
        </div>

        <!-- Loading Indicator -->
        <div v-if="isProcessing" class="mt-4 flex flex-col items-center">
          <div class="loader mb-2"></div>
          <p class="text-indigo-300">Processing your voice...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useVoiceRecorder } from "@/composables/useVoiceRecorder"
import { enhanceJournal, generateTasksFromText } from "@/services/aiService"
import { addTaskToFirebase } from "@/services/firebaseService"
import { useAuthStore } from "@/stores/authStore"

const authStore = useAuthStore()
const router = useRouter()
const starsCanvas = ref(null)
const waveCanvas = ref(null)

const isRecording = ref(false)
const isProcessing = ref(false)
const entryText = ref("")

let audioCtx, analyser, dataArray, source, animationId

const { startRecording, stopRecording } = useVoiceRecorder((raw) => {
  entryText.value = raw
})

// Toggle mic
async function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
    stopWave()
    isRecording.value = false
    await processVoice()
  } else {
    startRecording()
    startWave()
    isRecording.value = true
  }
}

// After recording, process text → enhance → save → redirect
async function processVoice() {
  if (!entryText.value.trim()) return
  isProcessing.value = true

  try {
    const enhanced = await enhanceJournal(entryText.value.trim())
    const tasks = await generateTasksFromText(enhanced)
    
    const entry = {
      id: crypto.randomUUID?.() || Date.now(),
      date: new Date().toLocaleString(),
      text: enhanced,
      rawText: entryText.value,
      tasks,
      timestamp: Date.now(),
    }
    // await saveTasksToFirebase(entry)
    if (!authStore.isLoggedIn) {
      localStorage.setItem("guestTasks", JSON.stringify(tasks))
    } else {
      await addTaskToFirebase(entry)
    }

    // router.push({ path: "/daily", query: { from: "morning" } })
    router.push({ path: "/daily", query: { tasks: JSON.stringify(tasks) } })
  } catch (err) {
    console.error("Processing failed:", err)
  } finally {
    isProcessing.value = false
  }
}

// --- Shooting stars animation ---
onMounted(() => {
  const canvas = starsCanvas.value
  const ctx = canvas.getContext("2d")
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5,
    speed: Math.random() * 0.5 + 0.2,
  }))

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "white"
    stars.forEach((star) => {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      ctx.fill()
      star.y += star.speed
      if (star.y > canvas.height) {
        star.y = 0
        star.x = Math.random() * canvas.width
      }
    })
    requestAnimationFrame(animate)
  }
  animate()
})

// --- Wave animation while recording ---
function startWave() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 256
  dataArray = new Uint8Array(analyser.frequencyBinCount)

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const canvas = waveCanvas.value
    const ctx = canvas.getContext("2d")
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    function draw() {
      animationId = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.lineWidth = 2
      ctx.strokeStyle = "rgba(255,255,255,0.8)"
      ctx.beginPath()

      const sliceWidth = (canvas.width * 1.0) / dataArray.length
      let x = 0
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }
    draw()
  })
}

function stopWave() {
  if (animationId) cancelAnimationFrame(animationId)
  if (audioCtx) audioCtx.close()
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 1s ease forwards;
}
.animate-fade-in-delay {
  animation: fade-in 1.5s ease forwards;
}

/* Loader spinner */
.loader {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Ripple water effect */
@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}
.animate-ripple {
  animation: ripple 2s linear infinite;
}
.animate-ripple.delay-300 {
  animation-delay: 0.3s;
}
.animate-ripple.delay-600 {
  animation-delay: 0.6s;
}
</style>