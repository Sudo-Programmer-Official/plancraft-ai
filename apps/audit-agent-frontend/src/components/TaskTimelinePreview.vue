<template>
  <div class="task-timeline-preview">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg text-slate-200 flex items-center gap-2">
        🕓 Task Timeline
      </h3>
      <el-button v-if="tasks.length > 1" size="small" @click="adjustSpacing">
        Auto-adjust Spacing
      </el-button>
    </div>

    <!-- Legend -->
    <div class="flex gap-4 text-xs text-slate-400 mb-3">
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 bg-indigo-600 rounded-sm"></span> Absolute
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 bg-emerald-600 rounded-sm"></span> Derived
      </span>
    </div>

    <!-- Timeline Visualization -->
    <div class="relative pb-4 overflow-x-auto">
      <div
        class="timeline-container"
        :style="{
          minWidth: `${Math.max(600, tasks.length * 220)}px`,
          minHeight: '140px'
        }"
      >
        <!-- Time markers -->
        <div class="absolute top-0 left-0 right-0 flex">
          <div
            v-for="(marker, i) in timeMarkers"
            :key="i"
            class="flex-1 text-xs text-slate-400 text-center"
            :style="{ borderLeft: i > 0 ? '1px solid rgba(148,163,184,0.1)' : 'none' }"
          >
            {{ marker }}
          </div>
        </div>

        <!-- Task blocks -->
        <div class="relative mt-6">
          <div
            v-for="(task, i) in tasks"
            :key="i"
            class="task-block absolute p-2 rounded-lg text-sm"
            :class="[
              getTaskType(task) === 'absolute' ? 'bg-indigo-900/60' : 'bg-emerald-900/60',
              'hover:brightness-110 transition-all duration-200'
            ]"
            :style="{
              left: `${getTaskPosition(task)}%`,
              width: `${getTaskWidth(task)}%`,
              top: `${getTaskRow(task) * 48}px`,
              borderLeft: '3px solid',
              borderColor: getTaskType(task) === 'absolute' ? '#818cf8' : '#34d399'
            }"
          >
            <div class="font-medium text-slate-200 truncate">
              {{ task.title || 'Untitled Task' }}
            </div>
            <div class="text-xs text-slate-400 mt-1">
              {{ formatTaskTime(task) }}
            </div>
          </div>

          <!-- Relationship lines -->
          <svg class="absolute top-0 left-0 w-full h-full pointer-events-none">
            <g v-for="(rel, i) in timeRelations" :key="i">
              <template v-if="rel.followsTaskId">
                <line
                  :x1="getTaskEndPosition(rel.followsTaskId - 1)"
                  :y1="getTaskRow(tasks[rel.followsTaskId - 1]) * 48 + 20"
                  :x2="getTaskPosition(tasks[rel.taskId - 1])"
                  :y2="getTaskRow(tasks[rel.taskId - 1]) * 48 + 20"
                  stroke="rgba(129,140,248,0.4)"
                  stroke-width="2"
                  stroke-dasharray="4"
                />
              </template>
              <template v-if="rel.parallelWithTaskId">
                <line
                  :x1="getTaskPosition(tasks[rel.parallelWithTaskId - 1])"
                  :y1="getTaskRow(tasks[rel.parallelWithTaskId - 1]) * 48 + 20"
                  :x2="getTaskPosition(tasks[rel.taskId - 1])"
                  :y2="getTaskRow(tasks[rel.taskId - 1]) * 48 + 20"
                  stroke="rgba(52,211,153,0.4)"
                  stroke-width="2"
                  stroke-dasharray="4"
                />
              </template>
            </g>
          </svg>
        </div>
      </div>
    </div>

    <!-- Task List -->
    <div class="mt-5 space-y-2 border-t border-slate-700/50 pt-3">
      <div v-for="(task, i) in tasks" :key="i" class="flex items-center gap-2">
        <el-tag
          :type="getTaskType(task) === 'absolute' ? 'info' : 'success'"
          size="small"
        >
          {{ getTaskType(task) }}
        </el-tag>
        <span class="text-slate-200 truncate">{{ task.title }}</span>
        <div class="flex-grow" />
        <el-button size="small" type="danger" plain @click="$emit('removeTask', i)">
          Remove
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  tasks: { type: Array, required: true },
  timeRelations: { type: Array, required: true }
})
const emit = defineEmits(['removeTask', 'updateTimes'])

function getTaskType(task) {
  return task?.time?.type || 'derived'
}

// === Time range & markers ===
const timeRange = computed(() => {
  const valid = props.tasks.map(t => dayjs(t.scheduledTime)).filter(t => t.isValid())
  if (!valid.length) return { start: dayjs(), end: dayjs().add(1, 'hour') }
  const start = valid.reduce((a, b) => (a.isBefore(b) ? a : b))
  const end = valid.reduce((a, b) => (a.isAfter(b) ? a : b))
  return { start: start.subtract(15, 'minute'), end: end.add(15, 'minute') }
})

const timeMarkers = computed(() => {
  const { start, end } = timeRange.value
  const duration = end.diff(start, 'minute')
  const step = Math.max(15, Math.floor(duration / 6))
  const out = []
  let current = start
  while (current.isBefore(end)) {
    out.push(current.format('HH:mm'))
    current = current.add(step, 'minute')
  }
  out.push(end.format('HH:mm'))
  return out
})

// === Helpers ===
function getTaskPosition(task) {
  const { start, end } = timeRange.value
  const total = end.diff(start, 'minute') || 1
  const t = dayjs(task.scheduledTime)
  return ((t.diff(start, 'minute')) / total) * 100
}
function getTaskEndPosition(i) {
  const task = props.tasks[i]
  if (!task) return 0
  const { start, end } = timeRange.value
  const total = end.diff(start, 'minute') || 1
  const endTime = dayjs(task.scheduledTime).add(task.estimate_minutes || 15, 'minute')
  return ((endTime.diff(start, 'minute')) / total) * 100
}
function getTaskWidth(task) {
  const { start, end } = timeRange.value
  const total = end.diff(start, 'minute') || 1
  return ((task.estimate_minutes || 15) / total) * 100
}
function getTaskRow(task) {
  if (!task?.scheduledTime) return 0
  const time = dayjs(task.scheduledTime)
  const end = time.add(task.estimate_minutes || 15, 'minute')
  let row = 0
  for (const other of props.tasks) {
    if (other === task) continue
    const oStart = dayjs(other.scheduledTime)
    const oEnd = oStart.add(other.estimate_minutes || 15, 'minute')
    if (time.isBefore(oEnd) && end.isAfter(oStart)) row++
  }
  return row
}
function formatTaskTime(task) {
  const type = getTaskType(task)
  if (task.scheduledTime)
    return dayjs(task.scheduledTime).format('hh:mm A')
  return type === 'absolute' ? task.time?.value : 'auto'
}
function adjustSpacing() {
  emit('updateTimes')
}
</script>

<style scoped>
.task-timeline-preview {
  background: rgba(15, 23, 42, 0.3);
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.15);
}
.timeline-container {
  position: relative;
  padding-top: 28px;
}
.task-block {
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  min-width: 120px;
}
</style>