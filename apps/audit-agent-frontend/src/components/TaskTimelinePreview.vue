// TaskTimelinePreview.vue - Shows temporal relationships between tasks
<template>
  <div class="task-timeline-preview">
    <!-- Timeline header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg text-slate-200">Task Timeline</h3>
      <el-button v-if="tasks.length > 1" size="small" @click="adjustSpacing">
        Auto-adjust Spacing
      </el-button>
    </div>

    <!-- Tasks timeline visualization -->
    <div class="relative pb-4 overflow-x-auto">
      <div 
        class="timeline-container"
        :style="{
          minWidth: `${Math.max(600, tasks.length * 200)}px`,
          minHeight: '120px'
        }"
      >
        <!-- Time markers -->
        <div class="absolute top-0 left-0 right-0 flex">
          <div 
            v-for="(marker, i) in timeMarkers" 
            :key="i"
            class="flex-1 text-xs text-slate-400 text-center"
            :style="{ borderLeft: i > 0 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none' }"
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
              task.time.type === 'absolute' ? 'bg-indigo-900/60' : 'bg-emerald-900/60',
              'hover:bg-opacity-80 transition-colors duration-200'
            ]"
            :style="{
              left: `${getTaskPosition(task)}%`,
              width: `${getTaskWidth(task)}%`,
              top: `${getTaskRow(task) * 40}px`,
              borderLeft: '3px solid',
              borderColor: task.time.type === 'absolute' ? '#818cf8' : '#34d399'
            }"
          >
            <div class="font-medium text-slate-200 truncate">{{ task.title }}</div>
            <div class="text-xs text-slate-400 mt-1">
              {{ formatTaskTime(task) }}
            </div>
          </div>

          <!-- Relationship lines -->
          <svg class="absolute top-0 left-0 w-full h-full pointer-events-none">
            <g v-for="(rel, i) in timeRelations" :key="i">
              <!-- Sequential relationships -->
              <template v-if="rel.followsTaskId">
                <line
                  :x1="getTaskEndPosition(rel.followsTaskId - 1)"
                  :y1="getTaskRow(tasks[rel.followsTaskId - 1]) * 40 + 20"
                  :x2="getTaskPosition(tasks[rel.taskId - 1])"
                  :y2="getTaskRow(tasks[rel.taskId - 1]) * 40 + 20"
                  stroke="rgba(129, 140, 248, 0.4)"
                  stroke-width="2"
                  stroke-dasharray="4"
                />
                <circle
                  :cx="getTaskPosition(tasks[rel.taskId - 1])"
                  :cy="getTaskRow(tasks[rel.taskId - 1]) * 40 + 20"
                  r="3"
                  fill="#818cf8"
                />
              </template>

              <!-- Parallel relationships -->
              <template v-if="rel.parallelWithTaskId">
                <line
                  :x1="getTaskPosition(tasks[rel.parallelWithTaskId - 1])"
                  :y1="getTaskRow(tasks[rel.parallelWithTaskId - 1]) * 40 + 20"
                  :x2="getTaskPosition(tasks[rel.taskId - 1])"
                  :y2="getTaskRow(tasks[rel.taskId - 1]) * 40 + 20"
                  stroke="rgba(52, 211, 153, 0.4)"
                  stroke-width="2"
                  stroke-dasharray="4"
                />
                <circle
                  :cx="getTaskPosition(tasks[rel.taskId - 1])"
                  :cy="getTaskRow(tasks[rel.taskId - 1]) * 40 + 20"
                  r="3"
                  fill="#34d399"
                />
              </template>
            </g>
          </svg>
        </div>
      </div>
    </div>

    <!-- Task list with actions -->
    <div class="mt-4 space-y-2">
      <div v-for="(task, i) in tasks" :key="i" class="flex items-center gap-2">
        <el-tag 
          :type="task.time.type === 'absolute' ? 'info' : 'success'"
          size="small"
        >
          {{ task.time.type }}
        </el-tag>
        <span class="text-slate-200">{{ task.title }}</span>
        <div class="flex-grow" />
        <el-button 
          size="small" 
          type="danger" 
          @click="$emit('removeTask', i)"
        >
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
  tasks: {
    type: Array,
    required: true
  },
  timeRelations: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['removeTask', 'updateTimes'])

// Compute timeline range
const timeRange = computed(() => {
  if (!props.tasks.length) return { start: dayjs(), end: dayjs().add(1, 'hour') }
  
  const times = props.tasks.map(t => dayjs(t.scheduledTime))
  const start = times.reduce((a, b) => a.isBefore(b) ? a : b)
  const end = times.reduce((a, b) => a.isAfter(b) ? a : b)
  
  // Add padding
  return {
    start: start.subtract(15, 'minutes'),
    end: end.add(15, 'minutes')
  }
})

// Generate time markers
const timeMarkers = computed(() => {
  const { start, end } = timeRange.value
  const duration = end.diff(start, 'minute')
  const markers = []
  const step = Math.max(15, Math.floor(duration / 8))
  
  let current = start
  while (current.isBefore(end)) {
    markers.push(current.format('HH:mm'))
    current = current.add(step, 'minutes')
  }
  markers.push(end.format('HH:mm'))
  return markers
})

// Position helpers
function getTaskPosition(task) {
  const time = dayjs(task.scheduledTime)
  const { start, end } = timeRange.value
  const duration = end.diff(start, 'minute')
  const position = time.diff(start, 'minute')
  return (position / duration) * 100
}

function getTaskEndPosition(taskIndex) {
  const task = props.tasks[taskIndex]
  if (!task) return 0
  const time = dayjs(task.scheduledTime).add(task.estimate_minutes || 15, 'minutes')
  const { start, end } = timeRange.value
  const duration = end.diff(start, 'minute')
  const position = time.diff(start, 'minute')
  return (position / duration) * 100
}

function getTaskWidth(task) {
  const duration = task.estimate_minutes || 15
  const { start, end } = timeRange.value
  const totalDuration = end.diff(start, 'minute')
  return (duration / totalDuration) * 100
}

// Row calculation to avoid overlaps
function getTaskRow(task) {
  const rows = []
  const time = dayjs(task.scheduledTime)
  const duration = task.estimate_minutes || 15
  const end = time.add(duration, 'minutes')
  
  for (let row = 0; row < props.tasks.length; row++) {
    const conflict = rows[row]?.some(t => {
      const tTime = dayjs(t.scheduledTime)
      const tEnd = tTime.add(t.estimate_minutes || 15, 'minutes')
      return time.isBefore(tEnd) && end.isAfter(tTime)
    })
    
    if (!conflict) {
      if (!rows[row]) rows[row] = []
      rows[row].push(task)
      return row
    }
  }
  return 0
}

function formatTaskTime(task) {
  if (task.time.type === 'absolute') {
    return dayjs(task.scheduledTime).format('HH:mm')
  }
  return task.time.value
}

function adjustSpacing() {
  emit('updateTimes')
}
</script>

<style scoped>
.task-timeline-preview {
  background: rgba(15, 23, 42, 0.3);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.timeline-container {
  position: relative;
  padding-top: 24px;
}

.task-block {
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 120px;
}
</style>