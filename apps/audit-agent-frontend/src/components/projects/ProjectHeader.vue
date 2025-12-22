<template>
  <div class="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-wrap items-center gap-4 justify-between">
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-2xl">
        📁
      </div>
      <div class="min-w-0 space-y-1">
        <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">Project</p>
        <div class="flex items-center gap-2">
          <input
            v-if="editing"
            v-model="draftName"
            class="text-2xl font-semibold text-white bg-transparent border-b border-indigo-400/60 focus:outline-none"
            :placeholder="project?.name || 'Project'"
            @keydown.enter.prevent="saveName"
          />
          <h1 v-else class="text-2xl font-semibold text-white leading-tight">
            {{ project?.name || 'Project' }}
          </h1>
          <button class="text-xs text-indigo-200 hover:text-white" @click="toggleEdit">
            {{ editing ? 'Save' : 'Edit' }}
          </button>
        </div>
        <p class="text-sm text-slate-300 line-clamp-2">{{ project?.description || 'No description yet.' }}</p>
      </div>
    </div>
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-200">
      <span
        class="px-3 py-1 rounded-full border"
        :class="project?.isActive ? 'border-emerald-300/50 text-emerald-200 bg-emerald-500/10' : 'border-slate-500/50 text-slate-200 bg-slate-500/10'"
      >
        {{ project?.isActive ? 'Active' : 'Archived' }}
      </span>
      <div class="flex flex-wrap gap-2 text-xs text-slate-400">
        <span v-if="project?.createdAt">Created {{ formatDate(project.createdAt) }}</span>
        <span v-if="project?.updatedAt" class="w-1 h-1 rounded-full bg-slate-500"></span>
        <span v-if="project?.updatedAt">Last activity {{ timeAgo(project.updatedAt) }}</span>
        <span class="w-1 h-1 rounded-full bg-slate-500"></span>
        <span>Owner: {{ project?.createdBy || 'Unknown' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs hover:border-indigo-400/60"
          @click="copyLink"
        >
          Copy link
        </button>
        <button
          class="px-3 py-1.5 rounded-lg border border-rose-400/50 bg-rose-500/10 text-xs text-rose-100 hover:border-rose-300/70"
          @click="archive"
        >
          {{ project?.isActive ? 'Archive' : 'Activate' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const props = defineProps({
  project: { type: Object, default: () => null },
  onUpdateName: { type: Function },
  onToggleActive: { type: Function },
})

const emit = defineEmits(['updateName', 'toggleActive'])

const editing = ref(false)
const draftName = ref('')

watch(
  () => props.project?.name,
  (val) => {
    draftName.value = val || ''
  },
  { immediate: true },
)

function formatDate(value) {
  if (!value) return '—'
  return dayjs(value).format('MMM D, YYYY')
}

function timeAgo(value) {
  if (!value) return '—'
  return dayjs(value).fromNow()
}

function toggleEdit() {
  if (editing.value) {
    saveName()
  } else {
    editing.value = true
  }
}

function saveName() {
  editing.value = false
  emit('updateName', draftName.value || props.project?.name)
}

function archive() {
  emit('toggleActive', !props.project?.isActive)
}

function copyLink() {
  try {
    const url = `${window.location.origin}/projects/${props.project?.id || ''}`
    navigator.clipboard?.writeText(url)
  } catch {}
}
</script>
