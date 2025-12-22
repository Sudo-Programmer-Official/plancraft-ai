<template>
  <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">Feedback</p>
        <h3 class="text-xl font-semibold text-white">Capture signal</h3>
        <p class="text-sm text-slate-300">Collect raw feedback before automation kicks in.</p>
      </div>
      <span class="text-xs text-slate-400">Ships to project-service only</span>
    </div>

    <form class="space-y-3" @submit.prevent="submit">
      <textarea
        v-model="form.text"
        rows="4"
        class="w-full rounded-xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        placeholder="What did you hear from customers or team?"
        required
      ></textarea>
      <div class="grid gap-3 sm:grid-cols-2">
        <input
          v-model="form.url"
          type="url"
          class="w-full rounded-xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Optional link or reproduction URL"
        />
        <input
          v-model="form.author"
          type="text"
          class="w-full rounded-xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Optional author/source"
        />
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1">
          <label class="text-sm text-slate-200">Source</label>
          <select
            v-model="form.source"
            class="w-full rounded-xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="client">Client</option>
            <option value="internal">Internal</option>
            <option value="ai">AI</option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="text-sm text-slate-200">Priority</label>
          <select
            v-model="form.priority"
            class="w-full rounded-xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <p v-if="form.priority === 'high'" class="text-xs text-rose-300">
        High priority feedback stands out for triage.
      </p>

      <div class="flex items-center justify-between text-sm text-slate-300">
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="form.includeLink" class="rounded text-indigo-500" />
          <span>Include current page URL</span>
        </label>
        <span v-if="success" class="text-emerald-300">Saved.</span>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          class="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition disabled:opacity-60"
          :disabled="loading || !form.text.trim()"
        >
          {{ loading ? 'Submitting…' : 'Submit feedback' }}
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-slate-200 hover:border-indigo-400/60 transition"
          disabled
        >
          Convert to task (soon)
        </button>
      </div>

      <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'

const props = defineProps({
  projectId: { type: String, required: true },
})

const emit = defineEmits(['submitted'])

const projectStore = useProjectStore()
const loading = ref(false)
const error = ref(null)
const success = ref(false)
const form = reactive({
  text: '',
  url: '',
  author: '',
  includeLink: false,
  source: 'client',
  priority: 'medium',
})

async function submit() {
  if (!form.text?.trim()) return
  loading.value = true
  error.value = null
  success.value = false
  try {
    const payload = {
      text: form.text,
      url: form.includeLink && typeof window !== 'undefined' ? window.location.href : form.url || undefined,
      author: form.author || undefined,
      source: form.source || 'client',
      priority: form.priority || 'medium',
    }
    await projectStore.addFeedback(props.projectId, payload)
    success.value = true
    emit('submitted')
    form.text = ''
    form.url = ''
    form.author = ''
    form.includeLink = false
    form.priority = 'medium'
    form.source = 'client'
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'Failed to submit feedback'
  } finally {
    loading.value = false
  }
}
</script>
