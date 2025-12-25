<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
    <div class="flex flex-col lg:flex-row gap-4 mb-6 items-start">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Content Board</h1>
        <p class="text-slate-300 text-sm mt-1 max-w-2xl">
          Draft, repurpose, and schedule across Instagram, LinkedIn, Twitter with AI assistance.
        </p>
      </div>
      <div class="flex gap-2 ml-auto">
        <button class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold" @click="newCampaign">
          New campaign
        </button>
        <button class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="goRepurpose">
          Repurpose
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-60"
          :disabled="autopilotRunning"
          @click="runAutopilot"
        >
          {{ autopilotRunning ? 'Running…' : 'Run Autopilot' }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 space-y-4">
        <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold">Drafts</h2>
            <RouterLink to="/creator/editor/new" class="text-sm text-indigo-300 hover:text-white">Open editor →</RouterLink>
          </div>
          <div class="grid sm:grid-cols-2 gap-3">
            <div
              v-for="draft in drafts"
              :key="draft.id"
              class="p-3 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-indigo-500 transition"
            >
              <p class="text-sm font-semibold">{{ draft.title }}</p>
              <p class="text-xs text-slate-400 mt-1 line-clamp-2">{{ draft.summary }}</p>
              <div class="mt-2 flex gap-2 text-[11px] text-slate-500">
                <span>{{ (draft.platforms || []).join(', ') }}</span>
                <span>•</span>
                <span>{{ draft.updatedAt }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold">Inspiration</h2>
            <button class="text-sm text-indigo-300 hover:text-white" @click="refreshInspiration">Refresh</button>
          </div>
          <div class="grid sm:grid-cols-2 gap-3">
            <div
              v-for="item in inspiration"
              :key="item.title"
              class="p-3 rounded-xl bg-slate-800/70 border border-slate-700"
            >
              <p class="text-sm font-semibold">{{ item.title }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ item.tip }}</p>
            </div>
          </div>
        </section>
      </div>

      <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg">
        <h2 class="text-lg font-semibold mb-3">Scheduled</h2>
        <div class="space-y-3">
          <div
            v-for="item in scheduled"
            :key="item.id"
            class="p-3 rounded-xl bg-slate-800/70 border border-slate-700"
          >
            <p class="text-sm font-semibold">{{ item.title }}</p>
            <p class="text-xs text-slate-400">{{ item.platform }} • {{ item.when }}</p>
            <div class="text-[11px] text-slate-500">Variant: {{ item.variant }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchCreatorBoard, fetchCreatorSlots, fetchCreatorInspiration, runCreatorAutopilot } from '@/services/creatorApi'

const router = useRouter()
const loading = ref(false)
const drafts = ref([])
const inspiration = ref([])
const scheduled = ref([])
const autopilotRunning = ref(false)

function fallbackInspiration() {
  return [
    { title: 'Founder spotlight', tip: 'Share a behind-the-scenes photo with 2–3 sentences on what you’re building this week.' },
    { title: 'Customer win', tip: 'Post a short quote from a user and add one actionable takeaway for your audience.' },
    { title: 'Teach a micro-skill', tip: 'Record a 30–60s clip showing a quick tip; turn the script into a LinkedIn post.' },
    { title: 'Weekend preview', tip: 'Preview something you’re shipping next week with a CTA to follow for updates.' },
  ]
}

function formatWhen(date) {
  if (!date) return 'Unscheduled'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

async function loadInspiration() {
  try {
    const inspo = await fetchCreatorInspiration()
    inspiration.value = Array.isArray(inspo) && inspo.length ? inspo : fallbackInspiration()
  } catch {
    inspiration.value = fallbackInspiration()
  }
}

async function loadBoard() {
  loading.value = true
  try {
    const data = await fetchCreatorBoard()
    drafts.value = data.drafts || []
    const baseInspo = data.inspiration?.length ? data.inspiration : await fetchCreatorInspiration()
    inspiration.value = (baseInspo && baseInspo.length) ? baseInspo : fallbackInspiration()
    scheduled.value = (data.scheduled || []).map((slot) => ({
      ...slot,
      when: formatWhen(slot.scheduledAt || slot.date),
    }))

    // Fallback: if board API returns no scheduled, pull directly from slots endpoint
    if (!scheduled.value.length) {
      const slots = await fetchCreatorSlots()
      scheduled.value = slots.map((slot) => ({
        id: slot.id,
        title: slot.caption || slot.title || 'Scheduled post',
        platform: slot.platform || 'platform',
        variant: slot.variantType || slot.variantId || 'variant',
        when: formatWhen(slot.scheduledAt || slot.date),
      }))
    }
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to load board')
  } finally {
    loading.value = false
  }
}

function newCampaign() {
  router.push('/creator/editor/new')
}

function goRepurpose() {
  router.push('/creator/repurpose')
}

async function refreshInspiration() {
  await loadInspiration()
}

onMounted(async () => {
  await loadBoard()
  if (!inspiration.value.length) await loadInspiration()
})

async function runAutopilot() {
  autopilotRunning.value = true
  try {
    const result = await runCreatorAutopilot()
    const count = result?.draftsCreated ?? result?.variants?.length ?? 0
    ElMessage.success(`Autopilot created ${count} draft${count === 1 ? '' : 's'}.`)
    await loadBoard()
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Autopilot run failed')
  } finally {
    autopilotRunning.value = false
  }
}
</script>
