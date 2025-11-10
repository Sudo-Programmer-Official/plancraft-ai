<template>
  <div class="inline-flex flex-col items-center justify-center">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        :r="radius"
        :cx="size / 2"
        :cy="size / 2"
        class="text-slate-700/40"
        :stroke-width="stroke"
        stroke="currentColor"
        fill="transparent"
      />
      <circle
        :r="radius"
        :cx="size / 2"
        :cy="size / 2"
        class="transition-all duration-500 ease-out"
        :stroke="color"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference - normalized * circumference"
        stroke-linecap="round"
        fill="transparent"
        :stroke-width="stroke"
      />
      <text
        :x="size / 2"
        :y="size / 2"
        class="fill-white font-semibold"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        {{ percentage }}%
      </text>
    </svg>
    <p v-if="label" class="mt-2 text-xs uppercase tracking-widest text-slate-300/80">{{ label }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 120 },
  stroke: { type: Number, default: 10 },
  label: { type: String, default: '' },
  color: { type: String, default: '#a855f7' },
})

const normalized = computed(() => {
  if (Number.isNaN(props.value)) return 0
  return Math.max(0, Math.min(1, props.value))
})
const percentage = computed(() => Math.round(normalized.value * 100))
const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
</script>

<style scoped>
svg circle:first-child {
  stroke: currentColor;
  opacity: 0.35;
}
</style>
