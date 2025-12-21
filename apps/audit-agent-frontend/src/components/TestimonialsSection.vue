<template>
  <section class="py-14 bg-gradient-to-b from-indigo-950/80 to-slate-950 text-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-300">Voices</p>
          <h2 class="text-3xl font-bold">What teams say</h2>
        </div>
        <div class="hidden sm:flex gap-2 text-sm text-indigo-200">
          <span class="px-3 py-1 rounded-full bg-white/10 border border-white/10">Auto-scroll</span>
          <span class="px-3 py-1 rounded-full bg-white/10 border border-white/10">Pause on hover</span>
        </div>
      </div>
      <div
        ref="track"
        class="overflow-hidden relative"
        @mouseenter="pause"
        @mouseleave="resume"
        @touchstart="pause"
        @touchend="resume"
      >
        <div
          ref="inner"
          class="flex gap-4 will-change-transform"
          :style="{ transform: `translateX(${offset}px)` }"
        >
          <article
            v-for="item in loopedTestimonials"
            :key="item.__key"
            class="min-w-[280px] max-w-xs sm:min-w-[320px] sm:max-w-sm flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-lg hover:-translate-y-1 transition"
          >
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden text-lg font-semibold">
                <img v-if="item.avatar" :src="item.avatar" alt="" class="h-full w-full object-cover" />
                <span v-else>{{ initials(item.name) }}</span>
              </div>
              <div>
                <p class="font-semibold text-white leading-tight">{{ item.name }}</p>
                <p class="text-xs text-indigo-200/80">{{ item.role }}</p>
              </div>
            </div>
            <p class="mt-3 text-indigo-100/90 text-sm leading-relaxed">“{{ item.quote }}”</p>
            <div v-if="item.audio" class="mt-3">
              <button
                class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm hover:bg-white/15"
                @click="togglePlay(item)"
              >
                <span v-if="playingId === item.__key">⏸</span>
                <span v-else>▶️</span>
                <span>Play voice</span>
              </button>
              <audio ref="audios" :data-key="item.__key" :src="item.audio" class="hidden" />
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  testimonials: {
    type: Array,
    default: () => [],
  },
})

const track = ref(null)
const inner = ref(null)
const offset = ref(0)
const speed = 0.5
let rafId = null
const playingId = ref(null)

const loopedTestimonials = computed(() => {
  const approved = (props.testimonials || []).filter((t) => t.status === 'approved')
  // duplicate for smooth loop
  return [...approved, ...approved].map((t, idx) => ({ ...t, __key: `${t.name}-${idx}-${t.quote.slice(0,6)}` }))
})

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'P'
}

function step() {
  const el = inner.value
  if (!el) return
  offset.value -= speed
  const totalWidth = el.scrollWidth / 2
  if (Math.abs(offset.value) >= totalWidth) {
    offset.value = 0
  }
  rafId = requestAnimationFrame(step)
}

function pause() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
}

function resume() {
  if (!rafId) rafId = requestAnimationFrame(step)
}

function togglePlay(item) {
  const nodes = (Array.isArray(audios.value) ? audios.value : []) || []
  const target = nodes.find((n) => n?.dataset?.key === item.__key)
  if (!target) return
  if (playingId.value === item.__key) {
    target.pause()
    playingId.value = null
    return
  }
  nodes.forEach((n) => {
    if (!n) return
    n.pause()
    n.currentTime = 0
  })
  target.play().catch(() => {})
  playingId.value = item.__key
  target.onended = () => {
    playingId.value = null
  }
}

const audios = ref([])

watch(
  () => props.testimonials,
  () => {
    pause()
    offset.value = 0
    resume()
  },
)

onMounted(() => {
  resume()
})

onBeforeUnmount(() => {
  pause()
})
</script>
