<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
    <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">New Project</p>
          <h2 class="text-xl font-semibold text-white">Structure execution</h2>
          <p class="text-sm text-slate-300">Keep it focused on teams, not personal tasks.</p>
        </div>
        <button class="text-slate-400 hover:text-white" @click="emit('close')">✕</button>
      </div>

      <form class="space-y-3" @submit.prevent="submit">
        <div class="space-y-1">
          <label class="text-sm text-slate-200">Project name</label>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="e.g., Voice Reminders v2"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm text-slate-200">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            placeholder="Purpose, scope, outcomes"
          ></textarea>
        </div>
        <div class="space-y-1">
          <label class="text-sm text-slate-200">Goal / outcome (optional)</label>
          <input
            v-model="form.outcome"
            type="text"
            class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="What success looks like"
          />
        </div>
        <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg border border-white/10 text-slate-200 hover:border-slate-400/60 transition"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:from-indigo-600 hover:to-purple-600 transition disabled:opacity-60"
            :disabled="loading || !form.name.trim()"
          >
            {{ loading ? 'Creating…' : 'Create project' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useProjectStore } from '@/stores/projectStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'created'])
const projectStore = useProjectStore()
const loading = ref(false)
const error = ref(null)

const form = reactive({
  name: '',
  description: '',
  outcome: '',
})

async function submit() {
  if (!form.name?.trim()) return
  loading.value = true
  error.value = null
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description || '',
      outcome: form.outcome || undefined,
    }
    const project = await projectStore.createNewProject(payload)
    emit('created', project)
    emit('close')
    form.name = ''
    form.description = ''
    form.outcome = ''
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'Failed to create project'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      error.value = null
      loading.value = false
    }
  },
)
</script>
