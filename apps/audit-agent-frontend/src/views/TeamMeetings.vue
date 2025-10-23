<template>
  <section class="team-meetings">
    <header class="meetings-header">
      <div>
        <h1>Team Meetings</h1>
        <p v-if="currentOrg">{{ currentOrg.name }} · recent syncs</p>
      </div>
      <button type="button" @click="onIngest" :disabled="!orgId || ingesting">
        {{ ingesting ? 'Processing…' : 'Log Meeting' }}
      </button>
    </header>

    <div v-if="loading" class="meetings-loading">Loading meetings…</div>

    <ul v-else-if="meetings.length" class="meetings-list">
      <li v-for="meeting in meetings" :key="meeting.id" class="meeting-item">
        <div class="top-row">
          <strong>{{ meeting.title }}</strong>
          <span class="status" :class="{ ready: meeting.transcriptReady }">
            {{ meeting.transcriptReady ? 'Transcript ready' : 'Awaiting transcript' }}
          </span>
        </div>
        <div class="meta">
          <span v-if="meeting.startAt">{{ formatDate(meeting.startAt) }}</span>
          <span v-if="meeting.attendees?.length">· {{ meeting.attendees.length }} attendees</span>
        </div>
        <ul v-if="meeting.generatedTaskPreview?.length" class="task-preview">
          <li v-for="(task, idx) in meeting.generatedTaskPreview" :key="idx">
            {{ task.title }} <small>({{ task.status }} · {{ task.priority }})</small>
          </li>
        </ul>
        <div class="actions">
          <button type="button" @click="() => goToDetail(meeting.id)" :disabled="!orgId">
            View Detail
          </button>
        </div>
      </li>
    </ul>

    <div v-else class="meetings-empty">
      <p>No meetings logged yet. Use “Log Meeting” to ingest calendar notes or voice transcripts.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import { useMeetingStore } from '@/stores/meetingStore'

const route = useRoute()
const router = useRouter()
const orgStore = useOrgStore()
const meetingStore = useMeetingStore()

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const currentOrg = computed(() => orgStore.currentOrg)
const meetings = computed(() => meetingStore.meetings)
const loading = computed(() => meetingStore.loading)
const ingesting = computed(() => meetingStore.ingesting)

watch(orgId, async (id) => {
  if (!id) return
  orgStore.setOrg(id)
  await meetingStore.load(id)
}, { immediate: true })

function formatDate(value: any) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    return date.toLocaleString()
  } catch (err) {
    console.error('date format error', err)
    return value
  }
}

async function onIngest() {
  if (!orgId.value) return
  const title = window.prompt('Meeting title?')
  if (!title) return
  const notes = window.prompt('Notes or agenda (optional):') || ''
  const meeting = await meetingStore.ingest(orgId.value, { title, notes })
  if (meeting?.id) {
    router.push({ name: 'team-meeting-detail', params: { orgId: orgId.value, meetingId: meeting.id } })
  }
}

function goToDetail(meetingId: string) {
  if (!orgId.value) return
  router.push({ name: 'team-meeting-detail', params: { orgId: orgId.value, meetingId } })
}
</script>

<style scoped>
.team-meetings { display: flex; flex-direction: column; gap: 16px; }
.meetings-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.meetings-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.meeting-item { padding: 14px; border: 1px solid rgba(0,0,0,0.12); border-radius: 12px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
.top-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.meta { font-size: 0.85rem; color: rgba(0,0,0,0.55); }
.status { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(0,0,0,0.5); }
.status.ready { color: #1b8a4d; }
.task-preview { list-style: none; padding-left: 0; display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: rgba(0,0,0,0.7); }
.task-preview small { color: rgba(0,0,0,0.5); }
.actions { display: flex; gap: 8px; }
button { padding: 8px 14px; border-radius: 8px; border: none; background: #111827; color: #fff; cursor: pointer; }
button[disabled] { background: rgba(0,0,0,0.2); cursor: not-allowed; }
.meetings-empty, .meetings-loading { padding: 24px; text-align: center; color: rgba(0,0,0,0.6); border: 1px dashed rgba(0,0,0,0.2); border-radius: 12px; background: #fff; }
</style>

