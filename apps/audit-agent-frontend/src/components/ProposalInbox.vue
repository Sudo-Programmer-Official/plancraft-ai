<template>
  <section class="bg-slate-900/60 border border-white/10 rounded-2xl shadow-lg p-5 space-y-5">
    <header class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-indigo-300">Impact proposals</p>
        <h3 class="text-xl font-semibold text-white">Review & approve</h3>
      </div>
      <div class="flex gap-2 text-sm">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-3 py-1.5 rounded border"
          :class="tab.key === activeTab ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-slate-700 text-slate-200'"
          @click="switchTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </header>

    <div
      v-if="!canModerate"
      class="rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300"
    >
      Editor or admin access is required to review workspace proposals.
    </div>

    <div v-else class="grid md:grid-cols-3 gap-4">
      <div class="md:col-span-1 space-y-2 max-h-[360px] overflow-y-auto pr-1">
        <div
          v-for="p in proposals"
          :key="p.id"
          class="p-3 rounded border border-slate-700 bg-slate-800/60 cursor-pointer hover:border-indigo-500"
          :class="{ 'ring-2 ring-indigo-500': p.id === selectedId }"
          @click="selectProposal(p.id)"
        >
          <p class="text-sm font-semibold text-white">{{ p.source?.type || 'source' }} · {{ p.source?.refId || p.id }}</p>
          <p class="text-xs text-slate-400">Impacts: {{ (p.impacts || []).length }}</p>
          <p class="text-xs text-slate-400 capitalize">Status: {{ p.status || 'pending' }}</p>
        </div>
        <p v-if="!proposals.length && !loadingList" class="text-xs text-slate-400">No proposals.</p>
        <p v-if="loadingList" class="text-xs text-slate-300">Loading…</p>
      </div>

      <div class="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded p-4 space-y-3" v-if="selected">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Proposal</p>
            <h4 class="text-lg text-white font-semibold">{{ selected.source?.type }} · {{ selected.source?.refId }}</h4>
            <p class="text-xs text-slate-400 capitalize">Status: {{ selected.status }}</p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="canModerate && selected.status === 'pending'"
              class="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-60"
              :disabled="busy"
              @click="decide(true)"
            >
              Approve
            </button>
            <button
              v-if="canModerate && selected.status === 'pending'"
              class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-sm disabled:opacity-60"
              :disabled="busy"
              @click="decide(false)"
            >
              Reject
            </button>
          </div>
        </div>

        <div>
          <p class="text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">Impacts</p>
          <div class="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            <div
              v-for="imp in selected.impacts || []"
              :key="imp.refId || imp.nodeId"
              class="rounded border border-slate-700 bg-slate-800/50 p-2"
            >
              <p class="text-sm text-white font-semibold">
                {{ imp.nodeType || 'item' }} · {{ imp.refId || imp.nodeId }}
              </p>
              <p class="text-xs text-slate-300 line-clamp-2">{{ imp.reason }}</p>
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>Confidence: {{ Math.round((imp.confidence || 0) * 100) }}%</span>
                <span>Proposals: {{ (imp.proposals || []).join(', ') || 'review' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="actions.length">
          <div class="flex items-center justify-between">
            <p class="text-xs uppercase tracking-[0.15em] text-slate-400">Actions</p>
            <div class="flex items-center gap-2">
              <button
                v-if="canModerate && readyActions.length"
                class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs disabled:opacity-60"
                :disabled="busyExec === 'all'"
                @click="openExecuteAll"
              >
                {{ busyExec === 'all' ? 'Executing…' : `Execute all (${readyActions.length})` }}
              </button>
              <span class="text-xs text-slate-400">Manual execution only</span>
            </div>
          </div>
          <div class="space-y-2">
            <div
              v-for="act in actions"
              :key="act.id"
              class="rounded border border-slate-700 bg-slate-800/50 p-2 flex items-center justify-between"
            >
              <div>
                <p class="text-sm text-white font-semibold">{{ humanAction(act) }}</p>
                <p class="text-xs text-slate-400 capitalize">Status: {{ act.status }}</p>
              </div>
              <button
                v-if="canModerate && act.status === 'ready'"
                class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs disabled:opacity-60"
                :disabled="busyExec === act.id"
                @click="execute(act.id)"
              >
                {{ busyExec === act.id ? 'Executing…' : 'Execute' }}
              </button>
            </div>
          </div>
        </div>

        <p class="text-xs text-slate-400">No auto-run. All actions require explicit approval and execution.</p>
      </div>

      <div v-else class="md:col-span-2 text-sm text-slate-400">
        Select a proposal to review.
      </div>
    </div>

    <div
      v-if="showConfirm"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
    >
      <div class="bg-slate-900 border border-slate-700 rounded-lg p-4 max-w-md w-full space-y-3">
        <h4 class="text-lg text-white font-semibold">Confirm execution</h4>
        <p class="text-sm text-slate-300">
          You are about to execute {{ pendingActionIds.length }} action<span v-if="pendingActionIds.length !== 1">s</span>.
        </p>
        <div class="text-xs text-slate-200 space-y-1">
          <p v-if="summaryCounts(pendingActionIds).create_task">• Create tasks: {{ summaryCounts(pendingActionIds).create_task }}</p>
          <p v-if="summaryCounts(pendingActionIds).update_task">• Update tasks: {{ summaryCounts(pendingActionIds).update_task }}</p>
          <p v-if="summaryCounts(pendingActionIds).mark_review">• Mark for review: {{ summaryCounts(pendingActionIds).mark_review }}</p>
        </div>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-1.5 rounded bg-slate-800 text-slate-200 text-sm"
            :disabled="busyExec === 'all'"
            @click="cancelConfirm"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-60"
            :disabled="busyExec === 'all'"
            @click="confirmExecute"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ElMessage } from 'element-plus'
import {
  listProposals,
  getProposal,
  approveProposalApi,
  listActions,
  executeActionApi,
} from '@/services/knowledgeService'

const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const role = computed(() => workspaceStore.activeWorkspaceRole || 'viewer')
const canModerate = computed(() => ['admin', 'editor'].includes(role.value))

const tabs = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]
const activeTab = ref('pending')
const proposals = ref([])
const loadingList = ref(false)
const selectedId = ref(null)
const selected = ref(null)
const actions = ref([])
const busy = ref(false)
const busyExec = ref('')
const showConfirm = ref(false)
const pendingActionIds = ref([])

const readyActions = computed(() => actions.value.filter((a) => a.status === 'ready'))

function switchTab(key) {
  activeTab.value = key
  selectedId.value = null
  selected.value = null
  actions.value = []
  loadProposals()
}

async function loadProposals() {
  if (!activeWorkspaceId.value || !canModerate.value) {
    proposals.value = []
    loadingList.value = false
    return
  }
  loadingList.value = true
  try {
    proposals.value = await listProposals({ workspaceId: activeWorkspaceId.value, status: activeTab.value })
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Failed to load proposals'
    ElMessage.error(msg)
  } finally {
    loadingList.value = false
  }
}

async function selectProposal(id) {
  selectedId.value = id
  actions.value = []
  try {
    selected.value = await getProposal(id)
    if (selected.value?.status === 'approved') {
      actions.value = await listActions(id)
    } else {
      actions.value = []
    }
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Failed to load proposal'
    ElMessage.error(msg)
  }
}

async function decide(approve) {
  if (!selectedId.value) return
  busy.value = true
  try {
    await approveProposalApi(selectedId.value, approve, null)
    ElMessage.success(approve ? 'Approved' : 'Rejected')
    await selectProposal(selectedId.value)
    await loadProposals()
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Decision failed'
    ElMessage.error(msg)
  } finally {
    busy.value = false
  }
}

async function execute(actionId) {
  if (!selectedId.value || !actionId) return
  pendingActionIds.value = [actionId]
  showConfirm.value = true
}

function humanAction(act) {
  const target = act?.target?.refId || act?.target?.nodeId || ''
  switch (act?.actionType) {
    case 'create_task':
      return 'Create task'
    case 'update_task':
      return `Update task ${target || ''}`
    case 'mark_review':
      return `Mark ${target || 'item'} for review`
    default:
      return act?.actionType || 'action'
  }
}

function summaryCounts(ids) {
  const counts = { create_task: 0, update_task: 0, mark_review: 0 }
  ids.forEach((id) => {
    const act = actions.value.find((a) => a.id === id)
    if (act && counts[act.actionType] !== undefined) counts[act.actionType] += 1
  })
  return counts
}

function openExecuteAll() {
  const ids = readyActions.value.map((a) => a.id)
  if (!ids.length) return
  pendingActionIds.value = ids
  showConfirm.value = true
}

async function confirmExecute() {
  if (!selectedId.value || !pendingActionIds.value.length) {
    showConfirm.value = false
    return
  }
  busyExec.value = 'all'
  let success = 0
  let failed = 0
  for (const id of pendingActionIds.value) {
    try {
      await executeActionApi(selectedId.value, id)
      success += 1
    } catch (err) {
      failed += 1
    }
  }
  showConfirm.value = false
  pendingActionIds.value = []
  busyExec.value = ''
  actions.value = await listActions(selectedId.value)
  const msg = `Executed: ${success} ok${failed ? `, ${failed} failed` : ''}`
  ElMessage.success(msg)
}

function cancelConfirm() {
  showConfirm.value = false
  pendingActionIds.value = []
}

watch(activeWorkspaceId, () => {
  selectedId.value = null
  selected.value = null
  actions.value = []
  loadProposals()
})

onMounted(() => {
  loadProposals()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
