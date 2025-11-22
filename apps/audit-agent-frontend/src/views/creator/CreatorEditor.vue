<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Editor</h1>
        <p class="text-slate-400 text-sm">Create once, repurpose everywhere.</p>
      </div>
      <div class="flex gap-2">
        <button class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="generateHook">AI Hook</button>
        <button class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold" @click="saveDraft">Save</button>
      </div>
    </header>

    <EditorToolbar :actions="toolbarActions" @action="handleToolbarAction">
      <template #status>
        <span class="text-xs text-slate-400">Autosave coming soon</span>
      </template>
    </EditorToolbar>

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <label class="block text-sm text-slate-300">Title</label>
        <input
          v-model="form.title"
          class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
          placeholder="Launch teaser for calm planning"
        />
        <label class="block text-sm text-slate-300">Narrative</label>
        <textarea
          v-model="form.narrative"
          rows="8"
          class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
          placeholder="Describe the idea, hook, CTA..."
        />

        <RepurposeActions @repurpose="onRepurpose" />
      </div>

      <div class="space-y-4">
        <PlatformPreviewInstagram :caption="form.narrative" :hashtags="['plancraftai','calmproductivity']" />
        <PlatformPreviewLinkedIn :content="form.narrative" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import EditorToolbar from '@/components/creator/EditorToolbar.vue'
import RepurposeActions from '@/components/creator/RepurposeActions.vue'
import PlatformPreviewInstagram from '@/components/creator/PlatformPreviewInstagram.vue'
import PlatformPreviewLinkedIn from '@/components/creator/PlatformPreviewLinkedIn.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({
  title: '',
  narrative: '',
})

const toolbarActions = [
  { label: 'Hook', type: 'hook' },
  { label: 'Outline', type: 'outline' },
  { label: 'CTA', type: 'cta' },
]

function handleToolbarAction(type) {
  // Placeholder: integrate creator-service AI later
  if (type === 'hook') form.narrative += '\nHook: Unlock calm productivity.'
}

function generateHook() {
  form.narrative += '\nAI Hook: Your calendar can be compassionate.'
}

function saveDraft() {
  router.push('/creator')
}

function onRepurpose(target) {
  router.push({ path: '/creator/repurpose', query: { target } })
}
</script>
