<template>
  <div class="bar-chart">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <g v-for="(bar, index) in bars" :key="index">
        <rect
          :x="bar.x"
          :y="bar.y"
          :width="barWidth"
          :height="bar.height"
          :fill="color"
          rx="4"
        />
      </g>
    </svg>
    <div class="labels">
      <span v-for="(item, index) in data" :key="index">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] }, // [{ label, value }]
  width: { type: Number, default: 360 },
  height: { type: Number, default: 120 },
  color: { type: String, default: '#6366f1' },
})

const padding = 12
const barGap = 12

const maxValue = computed(() => Math.max(1, ...props.data.map((d) => Number(d.value || 0))))
const barWidth = computed(() => {
  const available = props.width - padding * 2
  const count = Math.max(1, props.data.length)
  return Math.max(8, (available - barGap * (count - 1)) / count)
})

const bars = computed(() => {
  const chartHeight = props.height - padding * 2
  return props.data.map((item, index) => {
    const value = Number(item.value || 0)
    const normalized = value / maxValue.value
    const height = Math.max(4, chartHeight * normalized)
    const x = padding + index * (barWidth.value + barGap)
    const y = padding + (chartHeight - height)
    return { x, y, height }
  })
})
</script>

<style scoped>
.bar-chart {
  width: 100%;
}

svg {
  width: 100%;
  height: auto;
  display: block;
}

.labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(30, 41, 59, 0.7);
  margin-top: 6px;
}

.labels span {
  flex: 1;
  text-align: center;
}
</style>
