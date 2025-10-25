<template>
  <div class="radar-chart">
    <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size">
      <g transform="translate(${size / 2}, ${size / 2})">
        <polygon :points="gridPolygon" fill="rgba(99, 102, 241, 0.08)" stroke="rgba(99, 102, 241, 0.24)" stroke-width="1" />
        <polygon :points="valuePolygon" :fill="fillColor" :stroke="strokeColor" stroke-width="2" />
        <g v-for="(axis, index) in axes" :key="axis.label">
          <line :x1="0" :y1="0" :x2="axisPoints[index].x" :y2="axisPoints[index].y" stroke="rgba(99, 102, 241, 0.35)" stroke-width="1" />
          <text :x="labelPoints[index].x" :y="labelPoints[index].y" dy="0.35em">{{ axis.label }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  axes: { type: Array, default: () => [] }, // [{ label, value }], value in [0,1]
  size: { type: Number, default: 220 },
  fillColor: { type: String, default: 'rgba(99,102,241,0.25)' },
  strokeColor: { type: String, default: '#6366f1' },
})

const radius = computed(() => props.size / 2 - 24)

const axisPoints = computed(() => {
  const count = Math.max(3, props.axes.length)
  return props.axes.map((axis, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    return {
      x: Math.cos(angle) * radius.value,
      y: Math.sin(angle) * radius.value,
    }
  })
})

const valuePolygon = computed(() => {
  const count = Math.max(3, props.axes.length)
  if (!props.axes.length) return ''
  return props.axes
    .map((axis, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2
      const valueRadius = radius.value * Math.max(0, Math.min(1, Number(axis.value || 0)))
      const x = Math.cos(angle) * valueRadius
      const y = Math.sin(angle) * valueRadius
      return `${x},${y}`
    })
    .join(' ')
})

const gridPolygon = computed(() => {
  if (!axisPoints.value.length) return ''
  return axisPoints.value.map((point) => `${point.x},${point.y}`).join(' ')
})

const labelPoints = computed(() => {
  return axisPoints.value.map((point) => ({ x: point.x * 1.15, y: point.y * 1.15 }))
})
</script>

<style scoped>
.radar-chart svg {
  width: 100%;
  height: auto;
  display: block;
  color: rgba(99, 102, 241, 0.75);
  font-size: 12px;
}
text {
  text-anchor: middle;
  fill: rgba(30, 41, 59, 0.7);
}
</style>
