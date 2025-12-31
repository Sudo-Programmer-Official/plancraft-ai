<template>
  <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-700/60 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div class="space-y-1">
      <div class="text-sm text-slate-300">{{ timeLabel }}</div>
      <div class="text-lg font-semibold text-white leading-tight">{{ meeting.title }}</div>
      <div v-if="meeting.participants?.length" class="text-xs text-slate-400 truncate">
        {{ meeting.participants.length }} participant{{ meeting.participants.length === 1 ? '' : 's' }}
      </div>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <a
        v-if="meeting.joinUrl"
        class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
        :href="meeting.joinUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ meeting.joinLabel || 'Join meeting' }}
      </a>
      <span class="px-2 py-1 rounded bg-slate-800 text-xs text-slate-200 border border-slate-700">Google Calendar</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  meeting: { type: Object, required: true },
})

const timeLabel = computed(() => {
  const dt = props.meeting?.start
  if (!dt) return ''
  const end = props.meeting?.end
  const startLabel = dayjs(dt).format('ddd, MMM D • h:mm A')
  const endLabel = end ? dayjs(end).format('h:mm A') : ''
  return endLabel ? `${startLabel}–${endLabel}` : startLabel
})
</script>
