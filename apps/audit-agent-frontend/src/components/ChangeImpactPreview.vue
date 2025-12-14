<template>
  <div class="change-impact">
    <header class="flex items-center justify-between mb-3">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Change impact</p>
        <h3 class="text-lg font-semibold text-white">
          <template v-if="impacts.length">This change may affect {{ impacts.length }} item<span v-if="impacts.length !== 1">s</span></template>
          <template v-else>No potential impacts found</template>
        </h3>
      </div>
      <button
        class="px-3 py-1.5 rounded bg-slate-800 text-slate-100 text-sm border border-slate-700 hover:border-slate-500 disabled:opacity-60"
        :disabled="loading || !source?.type || !source?.refId"
        @click="runCheck"
      >
        <span v-if="loading">Checking…</span>
        <span v-else>Check impact</span>
      </button>
    </header>

    <p v-if="error" class="text-sm text-amber-300 mb-3">⚠️ {{ error }}</p>
    <p v-if="!loading && !impacts.length && !error" class="text-sm text-slate-300 mb-3">
      No potential impacts detected.
    </p>

    <div v-if="loading" class="text-sm text-slate-300 mb-3">Running impact analysis…</div>

    <div v-if="impacts.length" class="space-y-4">
      <div v-for="group in grouped" :key="group.key" class="space-y-2">
        <p class="text-xs uppercase tracking-[0.15em] text-slate-400">{{ group.label }}</p>
        <div class="space-y-2">
          <div
            v-for="item in group.items"
            :key="item.nodeId"
            class="rounded-lg border border-slate-700 bg-slate-900/70 p-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-1">
                <p class="text-sm font-semibold text-white">
                  {{ item.title || item.refId || item.nodeId }}
                </p>
                <p class="text-xs text-slate-300 line-clamp-2">{{ item.reason }}</p>
                <p class="text-[11px] text-slate-400">{{ confidenceTag(item.confidence) }}</p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="pill in item.proposals || []"
                    :key="pill"
                    class="inline-flex items-center px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-200 border border-slate-700"
                  >
                    {{ formatProposal(pill) }}
                  </span>
                  <span class="inline-flex items-center gap-1 text-[11px] text-slate-300">
                    <button
                      class="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-100 border border-emerald-500/40 text-[11px]"
                      :disabled="!!busyFeedback[item.nodeId]"
                      @click="sendFeedback(item, 'relevant')"
                    >
                      👍 Relevant
                    </button>
                    <button
                      class="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]"
                      :disabled="!!busyFeedback[item.nodeId]"
                      @click="sendFeedback(item, 'irrelevant')"
                    >
                      👎 Not relevant
                    </button>
                  </span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 min-w-[90px]">
                <span class="text-xs text-slate-400">Confidence</span>
                <div class="w-full h-2 rounded bg-slate-800 overflow-hidden">
                  <div
                    class="h-full"
                    :class="confidenceClass(item.confidence)"
                    :style="{ width: Math.round(item.confidence * 100) + '%' }"
                  ></div>
                </div>
                <span class="text-xs text-slate-200">{{ Math.round(item.confidence * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <details class="text-xs text-slate-400">
        <summary class="cursor-pointer select-none">Details</summary>
        <div class="mt-1 space-y-1">
          <div>Visited nodes: {{ stats.visitedNodes }}</div>
          <div>Visited edges: {{ stats.visitedEdges }}</div>
          <div>Hop counts: {{ stats.hopCounts ? JSON.stringify(stats.hopCounts) : '-' }}</div>
        </div>
      </details>
    </div>

    <p class="text-xs text-slate-400 mt-4">
      Impact analysis is read-only. No changes were made.
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchChangeImpact, sendImpactFeedback } from '@/services/knowledgeService'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const props = defineProps({
  source: {
    type: Object,
    required: true,
  },
  diffSummary: {
    type: String,
    default: '',
  },
})

const impacts = ref([])
const stats = ref({})
const loading = ref(false)
const error = ref('')
const workspaceStore = useWorkspaceStore()
const busyFeedback = ref({})

const grouped = computed(() => {
  const groups = {
    task: { key: 'task', label: 'Tasks', items: [] },
    requirement: { key: 'requirement', label: 'Requirements', items: [] },
    doc: { key: 'doc', label: 'Documents', items: [] },
    other: { key: 'other', label: 'Other', items: [] },
  }
  for (const item of impacts.value) {
    const t = String(item.nodeType || 'other').toLowerCase()
    if (t === 'task') groups.task.items.push(item)
    else if (t === 'requirement') groups.requirement.items.push(item)
    else if (t === 'doc' || t === 'chunk') groups.doc.items.push(item)
    else groups.other.items.push(item)
  }
  return Object.values(groups).filter((g) => g.items.length)
})

function confidenceClass(conf) {
  if (conf >= 0.7) return 'bg-emerald-500'
  if (conf >= 0.5) return 'bg-amber-400'
  return 'bg-slate-500'
}

function formatProposal(p) {
  if (!p) return ''
  const lower = String(p).toLowerCase()
  if (lower === 'review') return 'Review'
  if (lower === 'update') return 'Update'
  if (lower === 'create') return 'Create follow-up'
  return p
}

function confidenceTag(conf) {
  if (conf >= 0.7) return 'High confidence'
  if (conf >= 0.5) return 'Medium confidence'
  return 'Low confidence'
}

async function sendFeedback(item, action) {
  if (!item || busyFeedback.value[item.nodeId]) return
  const workspaceId = workspaceStore.activeWorkspaceId
  if (!workspaceId) return
  busyFeedback.value = { ...busyFeedback.value, [item.nodeId]: true }
  try {
    await sendImpactFeedback({
      workspaceId,
      source: { type: props.source.type, refId: props.source.refId },
      impacted: { type: item.nodeType, refId: item.refId || item.nodeId },
      confidence: item.confidence,
      userAction: action,
    })
    ElMessage.success(action === 'relevant' ? 'Marked as relevant' : 'Marked as not relevant')
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Failed to send feedback'
    ElMessage.error(msg)
  } finally {
    const copy = { ...busyFeedback.value }
    delete copy[item.nodeId]
    busyFeedback.value = copy
  }
}

async function runCheck() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetchChangeImpact({
      workspaceId: workspaceStore.activeWorkspaceId,
      source: { type: props.source.type, refId: props.source.refId },
      diffSummary: props.diffSummary || undefined,
    })
    impacts.value = Array.isArray(res?.impacts) ? res.impacts : []
    stats.value = res?.stats || {}
    if (!impacts.value.length && !error.value) {
      // leave quiet; empty state handles messaging
    }
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Impact check failed'
    error.value = msg
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
