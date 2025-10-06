<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
    <polyline :points="points" fill="none" :stroke="color" :stroke-width="2" />
    <g v-for="(p, i) in plotted" :key="i">
      <circle :cx="p.x" :cy="p.y" r="2" :fill="color" />
    </g>
  </svg>
  <div class="flex justify-between text-xs text-slate-400 mt-1">
    <span>{{ labels[0] }}</span>
    <span>{{ labels[labels.length-1] }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  data: { type: Array, default: () => [] }, // [{ day: 'YYYY-MM-DD', value: number }]
  width: { type: Number, default: 320 },
  height: { type: Number, default: 80 },
  color: { type: String, default: '#a78bfa' },
})

const padding = 8
const labels = computed(() => props.data.map(d => d.day))
const maxVal = computed(() => Math.max(1, ...props.data.map(d => Number(d.value || 0))))
const plotted = computed(() => {
  const n = props.data.length || 1
  const w = props.width - padding * 2
  const h = props.height - padding * 2
  return props.data.map((d, idx) => {
    const x = padding + (idx * (w / Math.max(1, n - 1)))
    const y = padding + (h - (h * (Number(d.value || 0) / maxVal.value)))
    return { x, y }
  })
})

const points = computed(() => plotted.value.map(p => `${p.x},${p.y}`).join(' '))
</script>

<style scoped>
svg { display: block; width: 100%; height: auto; }
</style>

