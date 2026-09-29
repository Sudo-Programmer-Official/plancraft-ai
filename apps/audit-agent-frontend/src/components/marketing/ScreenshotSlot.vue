<template>
  <div class="shot" :class="[`shot--${frame}`, { 'shot--missing': missing }]">
    <div class="shot__screen" :style="{ aspectRatio: `${width} / ${height}` }">
      <picture v-if="!missing">
        <source type="image/avif" :srcset="srcset('avif')" :sizes="sizes" />
        <source type="image/webp" :srcset="srcset('webp')" :sizes="sizes" />
        <img
          ref="imgEl"
          :key="resolvedName"
          :src="`${base}-1080.webp`"
          :alt="alt"
          :width="width"
          :height="height"
          :loading="eager ? 'eager' : 'lazy'"
          :fetchpriority="eager ? 'high' : 'auto'"
          decoding="async"
          class="shot__img"
          :class="{ 'shot__img--sequence': isAnimatedSequence }"
          :style="{ objectPosition: position }"
          @error="handleImageError"
        />
      </picture>

      <!-- Neutral stand-in until the real screenshot is added. No product UI is drawn here. -->
      <div v-else class="shot__placeholder" role="img" :aria-label="alt">
        <img src="/icons/icon-96x96.png" alt="" width="48" height="48" class="shot__placeholder-icon" />
        <span class="shot__placeholder-label">{{ label }}</span>
        <code v-if="isDev" class="shot__placeholder-path">public/marketing/screenshots/{{ name }}-1080.webp</code>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// Screenshots live in public/marketing/screenshots as <name>-640 / <name>-1080
// in both .avif and .webp. Generate them with `npm run marketing:images`.
const props = defineProps({
  name: { type: String, required: true },
  alt: { type: String, required: true },
  label: { type: String, default: '' },
  // Intrinsic size of the source screenshot (iPhone 6.1" portrait by default).
  width: { type: Number, default: 1179 },
  height: { type: Number, default: 2556 },
  sizes: { type: String, default: '(min-width: 1024px) 320px, 70vw' },
  frame: { type: String, default: 'phone' }, // 'phone' | 'card'
  position: { type: String, default: 'top center' },
  eager: { type: Boolean, default: false },
  fallbackName: { type: String, default: '' },
  sequence: { type: Array, default: () => [] },
  sequenceInterval: { type: Number, default: 4200 },
})

const missing = ref(false)
const imgEl = ref(null)
const isDev = import.meta.env.DEV
const fallbackAttempted = ref(false)
const resolvedName = ref(props.name)
const sequenceNames = computed(() => (props.sequence.length > 1 ? props.sequence : [props.name]))
const isAnimatedSequence = computed(() => sequenceNames.value.length > 1)
const sequenceIndex = ref(Math.max(0, sequenceNames.value.indexOf(props.name)))
let sequenceTimer = null

// On a prerendered page the image can fail before hydration attaches @error.
onMounted(() => {
  const img = imgEl.value
  if (img?.complete && img.naturalWidth === 0) handleImageError()

  if (!isAnimatedSequence.value) return
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  if (prefersReducedMotion) return

  sequenceNames.value.forEach((name) => {
    const preload = new Image()
    preload.src = `/marketing/screenshots/${name}-1080.webp`
  })
  sequenceTimer = window.setInterval(() => {
    sequenceIndex.value = (sequenceIndex.value + 1) % sequenceNames.value.length
    fallbackAttempted.value = false
    missing.value = false
    resolvedName.value = sequenceNames.value[sequenceIndex.value]
  }, Math.max(2500, Number(props.sequenceInterval) || 4200))
})
onBeforeUnmount(() => {
  if (sequenceTimer) window.clearInterval(sequenceTimer)
})
const base = computed(() => `/marketing/screenshots/${resolvedName.value}`)

function handleImageError() {
  if (props.fallbackName && !fallbackAttempted.value && props.fallbackName !== props.name) {
    fallbackAttempted.value = true
    resolvedName.value = props.fallbackName
    missing.value = false
    return
  }
  missing.value = true
}

function srcset(ext) {
  return `${base.value}-640.${ext} 640w, ${base.value}-1080.${ext} 1080w`
}
</script>

<style scoped>
.shot {
  position: relative;
  width: 100%;
}

.shot--phone {
  padding: 10px;
  border-radius: 44px;
  background: #0b0b12;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 30px 60px -20px rgba(49, 46, 129, 0.45),
    0 18px 36px -18px rgba(15, 23, 42, 0.5);
}

.shot--phone .shot__screen {
  border-radius: 34px;
}

.shot--card .shot__screen {
  border-radius: 18px;
}

.shot__screen {
  position: relative;
  overflow: hidden;
  background: #111827;
}

.shot--card .shot__screen {
  background: #eef2ff;
}

.shot__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shot__img--sequence {
  animation: shot-sequence-in 520ms ease both;
}

@keyframes shot-sequence-in {
  from {
    opacity: 0.35;
    transform: scale(1.015);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.shot__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  text-align: center;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(129, 140, 248, 0.45), transparent 60%),
    linear-gradient(160deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%);
}

.shot--card .shot__placeholder {
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(165, 180, 252, 0.55), transparent 65%),
    linear-gradient(160deg, #eef2ff 0%, #e0e7ff 100%);
}

.shot__placeholder-icon {
  border-radius: 12px;
  opacity: 0.95;
}

.shot__placeholder-label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(224, 231, 255, 0.85);
}

.shot--card .shot__placeholder-label {
  color: #4338ca;
}

.shot__placeholder-path {
  max-width: 100%;
  font-size: 0.65rem;
  color: rgba(224, 231, 255, 0.7);
  overflow-wrap: anywhere;
}

.shot--card .shot__placeholder-path {
  color: #6366f1;
}
</style>
