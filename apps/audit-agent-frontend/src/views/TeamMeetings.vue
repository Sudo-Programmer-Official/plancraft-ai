<template>
  <section class="team-meetings">
    <header class="meetings-header">
      <div>
        <h1>Team Meetings</h1>
        <p v-if="currentOrg">{{ currentOrg.name }} · recent syncs</p>
      </div>
      <div class="header-controls">
        <select v-model="selectedProjectId" :disabled="!projects.length">
          <option value="">All Projects</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
        <button type="button" @click="onIngest" :disabled="!orgId || ingesting">
          {{ ingesting ? 'Processing…' : 'Log Meeting' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="meetings-loading">Loading meetings…</div>

    <ul v-else-if="filteredMeetings.length" class="meetings-list">
      <li v-for="meeting in filteredMeetings" :key="meeting.id" class="meeting-item">
        <div class="top-row">
          <strong>{{ meeting.title }}</strong>
          <span class="status" :class="{ ready: meeting.transcriptReady }">
            {{ meeting.transcriptReady ? 'Transcript ready' : 'Awaiting transcript' }}
          </span>
        </div>
        <div class="meta">
          <span v-if="meeting.startAt">{{ formatDate(meeting.startAt) }}</span>
          <span v-if="meeting.attendees?.length">· {{ meeting.attendees.length }} attendees</span>
          <span v-if="meeting.projectId">· {{ projectMap[meeting.projectId]?.name || meeting.projectId }}</span>
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
          <button type="button" @click="() => joinLive(meeting.id)" :disabled="!orgId">
            Join Live
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { useProjectStore } from '@/stores/projectStore'

const route = useRoute()
const router = useRouter()
const orgStore = useOrgStore()
const meetingStore = useMeetingStore()
const projectStore = useProjectStore()

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const currentOrg = computed(() => orgStore.currentOrg)
const meetings = computed(() => meetingStore.meetings)
const loading = computed(() => meetingStore.loading)
const ingesting = computed(() => meetingStore.ingesting)
const projects = computed(() => projectStore.projects)
const projectMap = computed(() => {
  const map: Record<string, { id: string; name: string }> = {}
  projectStore.projects.forEach((project) => {
    map[project.id] = project
  })
  return map
})
const selectedProjectId = ref('')
const filteredMeetings = computed(() => {
  if (!selectedProjectId.value) return meetings.value
  return meetings.value.filter((meeting) => meeting.projectId === selectedProjectId.value)
})

watch(orgId, async (id) => {
  if (!id) return
  orgStore.setOrg(id)
  await Promise.all([projectStore.load(id), meetingStore.load(id)])
  if (!selectedProjectId.value && projectStore.projects.length === 1) {
    selectedProjectId.value = projectStore.projects[0].id
  }
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
  const meeting = await meetingStore.ingest(orgId.value, { title, notes, projectId: selectedProjectId.value || null })
  if (meeting?.id) {
    router.push({ name: 'team-meeting-detail', params: { orgId: orgId.value, meetingId: meeting.id } })
  }
}

function goToDetail(meetingId: string) {
  if (!orgId.value) return
  router.push({ name: 'team-meeting-detail', params: { orgId: orgId.value, meetingId } })
}

function joinLive(meetingId: string) {
  if (!orgId.value) return
  router.push({ name: 'team-meeting-room', params: { orgId: orgId.value, meetingId } })
}
</script>

<style scoped>
.team-meetings { display: flex; flex-direction: column; gap: 16px; }
.meetings-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.header-controls { display: flex; align-items: center; gap: 10px; }
.header-controls select { padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.18); }
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
