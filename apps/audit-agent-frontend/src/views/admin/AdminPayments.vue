<template>
  <div class="space-y-6">
    <section class="space-y-3">
      <h2 class="text-2xl font-bold">User Payments</h2>
      <div class="overflow-auto rounded border border-white/10">
        <table class="min-w-full text-sm">
          <thead class="bg-white/5">
            <tr>
              <th class="text-left px-3 py-2">User</th>
              <th class="text-left px-3 py-2">Plan</th>
              <th class="text-left px-3 py-2">Status</th>
              <th class="text-left px-3 py-2">Renews</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in payments" :key="p.id" class="border-t border-white/10">
              <td class="px-3 py-2">{{ p.userEmail || p.userId }}</td>
              <td class="px-3 py-2">{{ p.plan }}</td>
              <td class="px-3 py-2">{{ p.status }}</td>
              <td class="px-3 py-2">{{ formatDate(p.renewsAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-bold">Workspace Billing</h2>
        <span class="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/20">
          {{ workspaces.length }} workspaces
        </span>
      </div>
      <div class="overflow-auto rounded border border-white/10">
        <table class="min-w-full text-sm">
          <thead class="bg-white/5">
            <tr>
              <th class="text-left px-3 py-2">Workspace</th>
              <th class="text-left px-3 py-2">Plan</th>
              <th class="text-left px-3 py-2">Status</th>
              <th class="text-left px-3 py-2">Seats</th>
              <th class="text-left px-3 py-2">Seats Used</th>
              <th class="text-left px-3 py-2">Last Event</th>
              <th class="text-left px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ws in workspaces" :key="ws.id" class="border-t border-white/10">
              <td class="px-3 py-2">
                <div class="font-semibold">{{ ws.name }}</div>
                <div class="text-xs text-white/60">#{{ ws.id }}</div>
              </td>
              <td class="px-3 py-2">{{ ws.plan }}</td>
              <td class="px-3 py-2">{{ ws.billingStatus || 'none' }}</td>
              <td class="px-3 py-2">{{ ws.seats ?? '—' }}</td>
              <td class="px-3 py-2">{{ ws.seatsUsed ?? '—' }}</td>
              <td class="px-3 py-2">
                <div v-if="ws.lastEvent">
                  <div>{{ ws.lastEvent.type }}</div>
                  <div class="text-xs text-white/60">{{ formatDate(ws.lastEvent.processedAt) }}</div>
                  <div class="text-xs text-white/60">status: {{ ws.lastEvent.billingStatus || '—' }}</div>
                </div>
                <span v-else class="text-xs text-white/60">—</span>
              </td>
              <td class="px-3 py-2">{{ formatDate(ws.updatedAt) }}</td>
              <td class="px-3 py-2">
                <button
                  class="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs hover:bg-white/15"
                  @click="loadTimeline(ws.id)"
                >
                  View timeline
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-bold">Recent Stripe Events</h2>
        <span class="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/20">
          {{ events.length }} events
        </span>
      </div>
      <div class="overflow-auto rounded border border-white/10">
        <table class="min-w-full text-sm">
          <thead class="bg-white/5">
            <tr>
              <th class="text-left px-3 py-2">Event</th>
              <th class="text-left px-3 py-2">Workspace</th>
              <th class="text-left px-3 py-2">Plan</th>
              <th class="text-left px-3 py-2">Seats</th>
              <th class="text-left px-3 py-2">Status</th>
              <th class="text-left px-3 py-2">Reason</th>
              <th class="text-left px-3 py-2">Processed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in events" :key="ev.id" class="border-t border-white/10">
              <td class="px-3 py-2">{{ ev.type }}</td>
              <td class="px-3 py-2">
                <div>{{ ev.workspaceId || '—' }}</div>
                <div v-if="ev.plan" class="text-xs text-white/60">plan: {{ ev.plan }}</div>
              </td>
              <td class="px-3 py-2">{{ ev.plan || '—' }}</td>
              <td class="px-3 py-2">{{ ev.seats ?? '—' }}</td>
              <td class="px-3 py-2">{{ ev.billingStatus || '—' }}</td>
              <td class="px-3 py-2">{{ ev.reason || '—' }}</td>
              <td class="px-3 py-2">{{ formatDate(ev.processedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="space-y-3" v-if="timeline.length">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-bold">Billing Timeline</h2>
        <span class="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/20">
          Workspace: {{ selectedWorkspaceId || '—' }}
        </span>
      </div>
      <div class="overflow-auto rounded border border-white/10">
        <table class="min-w-full text-sm">
          <thead class="bg-white/5">
            <tr>
              <th class="text-left px-3 py-2">Event</th>
              <th class="text-left px-3 py-2">Plan</th>
              <th class="text-left px-3 py-2">Seats</th>
              <th class="text-left px-3 py-2">Status</th>
              <th class="text-left px-3 py-2">Reason</th>
              <th class="text-left px-3 py-2">Processed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in timeline" :key="ev.id" class="border-t border-white/10">
              <td class="px-3 py-2">{{ ev.type }}</td>
              <td class="px-3 py-2">{{ ev.plan || '—' }}</td>
              <td class="px-3 py-2">{{ ev.seats ?? '—' }}</td>
              <td class="px-3 py-2">{{ ev.billingStatus || '—' }}</td>
              <td class="px-3 py-2">{{ ev.reason || '—' }}</td>
              <td class="px-3 py-2">{{ formatDate(ev.processedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const payments = ref([])
const workspaces = ref([])
const events = ref([])
const timeline = ref([])
const selectedWorkspaceId = ref('')

function formatDate(d) { try { return new Date(d).toLocaleString() } catch { return '' } }

async function loadTimeline(workspaceId) {
  if (!workspaceId) {
    timeline.value = []
    return
  }
  selectedWorkspaceId.value = workspaceId
  try {
    const { data } = await api.get(`/admin/billing/workspaces/${workspaceId}/timeline`)
    timeline.value = data?.events || []
  } catch (e) {
    timeline.value = []
    ElMessage.error('Failed to load billing timeline')
  }
}

onMounted(async () => {
  try {
    const res = await api.get('/admin/payments')
    payments.value = res?.data || []
  } catch (e) {
    ElMessage.error('Failed to load payments')
  }

  try {
    const { data } = await api.get('/admin/billing/workspaces')
    workspaces.value = data?.workspaces || []
  } catch (e) {
    ElMessage.error('Failed to load workspace billing')
  }

  try {
    const { data } = await api.get('/admin/billing/events')
    events.value = data?.events || []
  } catch (e) {
    ElMessage.error('Failed to load events')
  }
})
</script>
