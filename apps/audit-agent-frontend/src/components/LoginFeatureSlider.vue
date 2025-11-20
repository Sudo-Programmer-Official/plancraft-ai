<template>
  <div
    class="login-feature-slider"
    @mouseenter="pause"
    @mouseleave="resume"
  >
    <transition name="feature-fade" mode="out-in">
      <p class="slider-line" :key="currentIndex">
        {{ features[currentIndex] }}
      </p>
    </transition>
    <div v-if="showDots" class="slider-dots">
      <span
        v-for="(feature, index) in features"
        :key="feature"
        class="dot"
        :class="{ active: index === currentIndex }"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  showDots: {
    type: Boolean,
    default: true,
  },
  intervalMs: {
    type: Number,
    default: 3200,
  },
})

const features = [
  'Plan your day in seconds with AI',
  'Sync Google & Outlook calendars effortlessly',
  'Smart reminders via text, WhatsApp, email, and calls',
  'Talk to your assistant by voice — no typing needed',
  'Keep track of goals, routines, & habits effortlessly',
]

const currentIndex = ref(0)
let timer = null

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % features.length
}

const start = () => {
  stop()
  timer = window.setInterval(nextSlide, props.intervalMs)
}

const stop = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const pause = () => stop()
const resume = () => start()

onMounted(() => {
  start()
})

onUnmounted(() => {
  stop()
})
</script>

<style scoped>
.login-feature-slider {
  min-height: 4.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.75rem;
  width: 100%;
  position: relative;
}

.slider-line {
  font-size: 1rem;
  color: rgba(224, 231, 255, 0.95);
  letter-spacing: 0.01em;
  max-width: 28rem;
  line-height: 1.45;
  text-shadow: 0 0 25px rgba(99, 102, 241, 0.45);
  padding: 0 1rem;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-dots {
  display: flex;
  gap: 0.4rem;
}

.dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: rgba(129, 140, 248, 0.4);
  transition: transform 0.3s ease, background 0.3s ease;
}

.dot.active {
  background: linear-gradient(120deg, #c084fc, #818cf8);
  transform: scale(1.2);
}

.feature-fade-enter-active,
.feature-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.feature-fade-enter-from,
.feature-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
