<template>
  <div class="confetti-overlay" v-show="visible">
    <div class="confetti-container">
      <span v-for="(c, i) in confetti" :key="i" class="confetti" :style="c.style">{{ c.emoji }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({ duration: { type: Number, default: 1600 } })
const emit = defineEmits(['done'])

const visible = ref(false)
const confetti = ref([])
let timer = null
let handler = null

function launch() {
  visible.value = true
  const emojis = ['🎉', '🎊', '✨', '🔥', '💫', '🌟']
  const items = Array.from({ length: 28 }).map(() => ({
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    style: {
      left: Math.floor(Math.random() * 100) + '%',
      animationDelay: Math.random() * 0.3 + 's',
      fontSize: 14 + Math.floor(Math.random() * 14) + 'px',
    },
  }))
  confetti.value = items
  timer = setTimeout(() => {
    visible.value = false
    emit('done')
  }, props.duration)
}

onMounted(() => {
  // Expose an imperative API via DOM event for simplicity
  handler = () => launch()
  window.addEventListener('confetti:launch', handler)
})

onBeforeUnmount(() => {
  try { if (handler) window.removeEventListener('confetti:launch', handler) } catch {}
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.confetti-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 9999;
}
.confetti-container {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.confetti {
  position: absolute;
  top: -20px;
  will-change: transform, opacity;
  animation: fall 1.6s linear forwards;
}
@keyframes fall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 0 }
  10%  { opacity: 1 }
  100% { transform: translateY(110vh) rotate(540deg); opacity: 0 }
}
</style>
