<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 text-white">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <header class="space-y-2">
        <p class="text-xs uppercase tracking-[0.35em] text-indigo-300">Billing</p>
        <h1 class="text-3xl sm:text-4xl font-bold">Upgrade Workspace</h1>
        <p class="text-indigo-200">
          Start a secure Stripe checkout for this workspace. Billing is workspace-level and seat-based.
        </p>
      </header>

        <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4 shadow-xl">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-1">
              <span class="text-sm text-indigo-200/80">Workspace ID</span>
              <input
                v-model="workspaceId"
              type="text"
              class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              placeholder="workspace id"
            />
          </label>
            <label class="space-y-1">
              <span class="text-sm text-indigo-200/80">Plan</span>
              <select
                v-model="plan"
                class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              >
                <option value="pro">Pro</option>
                <option value="starter">Starter</option>
              </select>
            </label>
            <label class="space-y-1">
            <span class="text-sm text-indigo-200/80">Seats</span>
            <input
              v-model.number="seats"
              type="number"
              min="3"
              class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            />
          </label>
        </div>

          <div class="rounded-xl bg-indigo-500/10 border border-indigo-400/30 p-4 text-indigo-100 text-sm">
            <p class="font-semibold text-white">How this works</p>
            <ul class="list-disc list-inside space-y-1 text-indigo-100/90">
              <li>Billing is workspace-level; seats = active teammates.</li>
              <li>Only workspace owners can upgrade or manage billing.</li>
              <li>We redirect you to Stripe Checkout; cancel anytime.</li>
            </ul>
          </div>

        <button
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-900/40"
          :disabled="submitting || !workspaceId || !isOwner"
          @click="submit"
        >
          {{ submitting ? 'Redirecting…' : 'Start Checkout' }}
        </button>
        <p v-if="!isOwner" class="text-sm text-amber-200">Only workspace owners can upgrade billing.</p>
        <p v-if="error" class="text-sm text-rose-200">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const plan = ref('pro')
const seats = ref(3)
const workspaceId = ref('')
const submitting = ref(false)
const error = ref('')
const selectedWorkspace = computed(() => {
  return (
    workspaceStore.workspaces.find((w) => w.id === workspaceId.value) ||
    workspaceStore.activeWorkspace ||
    null
  )
})
const isOwner = computed(() => {
  const uid = authStore?.user?.uid
  return !!uid && !!selectedWorkspace.value && selectedWorkspace.value.ownerId === uid
})

onMounted(async () => {
  try {
    if (!workspaceStore.hydrated) await workspaceStore.init()
  } catch {}
  const qsPlan = route.query.plan
  const qsWs = route.query.workspaceId
  if (typeof qsPlan === 'string') plan.value = qsPlan
  if (typeof qsWs === 'string') workspaceId.value = qsWs
  if (workspaceStore?.activeWorkspaceId && !workspaceId.value) {
    workspaceId.value = workspaceStore.activeWorkspaceId
  }
  if (selectedWorkspace.value?.seats) {
    seats.value = selectedWorkspace.value.seats
  } else if (selectedWorkspace.value?.seatsUsed) {
    seats.value = selectedWorkspace.value.seatsUsed
  }
})

watch(
  () => selectedWorkspace.value?.id,
  () => {
    if (selectedWorkspace.value?.seats) seats.value = selectedWorkspace.value.seats
    else if (selectedWorkspace.value?.seatsUsed) seats.value = selectedWorkspace.value.seatsUsed
  },
)

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    const { data } = await api.post('/billing/checkout', {
      workspaceId: workspaceId.value,
      plan: plan.value,
      seatCount: seats.value,
    })
    const url = data?.url
    if (url) {
      window.location.href = url
      return
    }
    ElMessage.error('Checkout could not start (missing URL)')
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'Failed to submit upgrade'
  } finally {
    submitting.value = false
  }
}
</script>
