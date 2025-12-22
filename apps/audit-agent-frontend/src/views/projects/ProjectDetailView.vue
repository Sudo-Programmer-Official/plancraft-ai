<template>
  <div class="space-y-5">
    <ProjectHeader
      v-if="project"
      :project="project"
      @updateName="updateProjectName"
      @toggleActive="toggleActive"
    />
    <div v-else-if="loadError" class="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-50">
      {{ loadError }}
    </div>
    <div v-else class="text-slate-200">Loading project…</div>

    <div class="flex flex-wrap gap-2 text-sm">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 rounded-lg border transition"
        :class="tab.key === activeTab ? 'border-indigo-400/70 bg-indigo-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:border-indigo-300/50'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'overview'" class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-200">
      Overview coming soon. Project ownership and sprints will live here.
    </div>

    <ActivityTimeline
      v-else-if="activeTab === 'activity'"
      :events="activityState.events"
      :loading="activityState.loading"
      :has-more="!!activityState.nextCursor"
      @loadMore="loadMore"
    />

    <ProjectFeedbackPanel
      v-else-if="activeTab === 'feedback'"
      :project-id="projectId"
      @submitted="refreshActivity"
    />

    <div v-else-if="activeTab === 'sprints'" class="space-y-3">
      <SprintList
        :sprints="sprints"
        :loading="sprintsLoading"
        @create="showCreateSprint = true"
        @start="startSprint"
        @complete="completeSprint"
      />
      <CreateSprintModal
        :open="showCreateSprint"
        :project-id="projectId"
        @close="showCreateSprint = false"
        @created="loadSprints"
      />
    </div>

    <div v-else class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-200">
      {{ tabCopy(activeTab) }}
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ActivityTimeline from '@/components/projects/ActivityTimeline.vue'
import ProjectFeedbackPanel from '@/components/projects/ProjectFeedbackPanel.vue'
import ProjectHeader from '@/components/projects/ProjectHeader.vue'
import SprintList from '@/components/projects/SprintList.vue'
import CreateSprintModal from '@/components/projects/CreateSprintModal.vue'
import { useProjectStore } from '@/stores/projectStore'

const route = useRoute()
const projectStore = useProjectStore()
const projectId = computed(() => route.params.projectId)
const project = computed(() => projectStore.projectsById[projectId.value] || null)
const activeTab = ref('activity')
const loadError = ref(null)
const sprintsLoading = ref(false)
const showCreateSprint = ref(false)

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'sprints', label: 'Sprints' },
  { key: 'settings', label: 'Settings' },
]

const activityState = computed(() => projectStore.activityByProject[projectId.value] || { events: [], nextCursor: null, loading: false })
const sprints = computed(() => projectStore.sprintsByProject[projectId.value] || [])

async function loadProject() {
  if (!projectId.value) return
  loadError.value = null
  try {
    await projectStore.ensureProject(projectId.value)
    await projectStore.loadActivity(projectId.value, { limit: 25 })
    await loadSprints()
  } catch (err) {
    console.warn('Project load failed', err?.message || err)
    loadError.value = err?.response?.data?.error || err?.message || 'Failed to load project'
  }
}

async function loadMore() {
  if (!projectId.value) return
  const cursor = activityState.value?.nextCursor || null
  await projectStore.loadActivity(projectId.value, { limit: 25, cursor }).catch(() => {})
}

async function refreshActivity() {
  if (!projectId.value) return
  await projectStore.loadActivity(projectId.value, { limit: 25 }).catch(() => {})
}

async function loadSprints() {
  if (!projectId.value) return
  sprintsLoading.value = true
  try {
    await projectStore.loadSprints(projectId.value)
  } catch (err) {
    console.warn('Sprints load failed', err?.message || err)
  } finally {
    sprintsLoading.value = false
  }
}

async function startSprint(sprint) {
  if (!projectId.value || !sprint?.id) return
  await projectStore.updateExistingSprint(projectId.value, sprint.id, { startDate: new Date().toISOString() }).catch(() => {})
}

async function completeSprint(sprint) {
  if (!projectId.value || !sprint?.id) return
  await projectStore.updateExistingSprint(projectId.value, sprint.id, { endDate: new Date().toISOString() }).catch(() => {})
}

async function updateProjectName(name) {
  if (!projectId.value || !name?.trim()) return
  await projectStore.updateProjectMeta(projectId.value, { name: name.trim() }).catch(() => {})
}

async function toggleActive(nextState) {
  if (!projectId.value) return
  await projectStore.updateProjectMeta(projectId.value, { isActive: !!nextState }).catch(() => {})
}

function tabCopy(key) {
  if (key === 'sprints') return 'Sprints view is coming soon.'
  if (key === 'settings') return 'Project settings will live here.'
  return 'Coming soon.'
}

onMounted(async () => {
  await loadProject()
})

watch(
  () => projectId.value,
  async () => {
    await loadProject()
  },
)
</script>
