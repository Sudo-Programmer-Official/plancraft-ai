<template>
  <section class="team-tasks">
    <header class="tasks-header">
      <div>
        <h1>Team Tasks</h1>
        <p v-if="currentProject">
          {{ currentProject.name }} · {{ tasks.length }} task<span v-if="tasks.length !== 1">s</span>
        </p>
        <p v-else-if="loadingProjects">Loading projects…</p>
        <p v-else>Select a project to view its tasks.</p>
      </div>
      <div class="project-picker">
        <select v-model="selectedProjectId" :disabled="!projects.length">
          <option disabled value="">Select project</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }} · {{ project.status }}
          </option>
        </select>
      </div>
    </header>

    <div class="task-input-card" v-if="currentProject">
      <div class="inputs">
        <input
          v-model="newTaskTitle"
          class="title"
          type="text"
          placeholder="Quick add task"
          @keyup.enter="createTask"
        />
        <textarea
          v-model="newTaskDescription"
          class="description"
          rows="2"
          placeholder="Notes (optional)"
        />
      </div>
      <div class="quick-actions">
        <button
          type="button"
          class="primary"
          @click="createTask"
          :disabled="creating || !canCreate"
        >
          {{ creating ? 'Adding…' : 'Add Task' }}
        </button>
        <button
          type="button"
          class="voice"
          @click="toggleVoiceCapture"
          :disabled="!orgId || !selectedProjectId || creating"
        >
          <span v-if="isRecording">⏹ Stop</span>
          <span v-else-if="isTranscribing">⏳ Processing…</span>
          <span v-else>🎤 Quick Voice</span>
        </button>
      </div>
      <p v-if="voiceTranscript" class="voice-preview">
        <span>Captured:</span> {{ voiceTranscript }}
      </p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>

    <div v-if="loadingTasks" class="tasks-loading">Loading tasks…</div>

    <ul v-else-if="tasks.length" class="tasks-list">
      <li v-for="task in tasks" :key="task.id" class="task-item">
        <label class="task-title">
          <input
            type="checkbox"
            :checked="task.status === 'completed'"
            @change="toggleStatus(task)"
          />
          <span :class="{ done: task.status === 'completed' }">{{ task.title }}</span>
        </label>
        <div class="task-meta">
          <span v-if="task.assignedTo" class="chip">👤 {{ task.assignedTo }}</span>
          <span v-if="task.dueDate" class="chip due">📅 {{ formatDate(task.dueDate) }}</span>
          <span class="chip status" :class="task.status">
            {{ task.status === 'completed' ? 'Completed' : 'Pending' }}
          </span>
          <span v-if="typeof task.progress === 'number'" class="chip progress">
            📈 {{ task.progress }}%
          </span>
        </div>
        <p v-if="task.description" class="task-description">{{ task.description }}</p>
        <p v-if="task.lastNote" class="task-note">
          <strong>Last update:</strong> {{ task.lastNote }}
        </p>
        <div class="task-controls">
          <label class="slider-label">
            Progress
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              :value="task.progress ?? 0"
              @change="onProgressChange(task, $event)"
            />
          </label>
          <button type="button" class="assign-btn" @click="claimTask(task)" :disabled="!canClaim(task)">
            {{ assignLabel(task) }}
          </button>
        </div>
        <footer class="task-actions">
          <span class="timestamp">Updated {{ formatDate(task.updatedAt) }}</span>
          <button type="button" class="danger" @click="removeTask(task)">Delete</button>
        </footer>
      </li>
    </ul>

    <div v-else class="tasks-empty">
      <p>No tasks yet for this project. Use quick add or voice capture to create one.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTeamTaskStore, type TeamTask } from '@/stores/teamTaskStore'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const orgStore = useOrgStore()
const projectStore = useProjectStore()
const taskStore = useTeamTaskStore()
const authStore = useAuthStore()

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const projects = computed(() => projectStore.projects)
const tasks = computed(() => taskStore.tasks)
const loadingProjects = computed(() => projectStore.loading)
const loadingTasks = computed(() => taskStore.loading)

const selectedProjectId = ref<string>('')
const newTaskTitle = ref('')
const newTaskDescription = ref('')
const creating = ref(false)
const errorMessage = ref<string | null>(null)
const voiceTranscript = ref('')

const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecorder((text: string) => {
  voiceTranscript.value = text
})

const currentProject = computed(() => projects.value.find((p) => p.id === selectedProjectId.value) || null)
const canCreate = computed(() => !!newTaskTitle.value.trim() && !!selectedProjectId.value)

watch(
  orgId,
  async (id) => {
    if (!id) {
      selectedProjectId.value = ''
      taskStore.clear()
      return
    }
    orgStore.setOrg(id)
    try {
      const loaded = await projectStore.load(id)
      if (!loaded.length) {
        selectedProjectId.value = ''
        taskStore.clear()
        return
      }
      if (!selectedProjectId.value || !loaded.some((p) => p.id === selectedProjectId.value)) {
        selectedProjectId.value = loaded[0].id
      }
    } catch (err) {
      console.error('Failed to load projects', err)
      errorMessage.value = 'Unable to load projects for this team.'
    }
  },
  { immediate: true },
)

watch(
  selectedProjectId,
  async (projectId) => {
    if (!projectId || !orgId.value) {
      taskStore.clear()
      return
    }
    try {
      errorMessage.value = null
      await taskStore.load(orgId.value, projectId)
    } catch (err) {
      console.error('Failed to load tasks', err)
      errorMessage.value = 'Unable to load tasks for this project.'
    }
  },
  { immediate: true },
)

async function createTask() {
  if (!orgId.value || !selectedProjectId.value || !newTaskTitle.value.trim()) return
  creating.value = true
  errorMessage.value = null
  try {
    await taskStore.create(orgId.value, selectedProjectId.value, {
      title: newTaskTitle.value.trim(),
      description: newTaskDescription.value.trim(),
      status: 'pending',
      metadata: { source: 'manual' },
    })
    newTaskTitle.value = ''
    newTaskDescription.value = ''
  } catch (err) {
    console.error('Failed to create task', err)
    errorMessage.value = 'Failed to create task.'
  } finally {
    creating.value = false
  }
}

async function toggleStatus(task: TeamTask) {
  const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
  try {
    await taskStore.updateStatus(task.id, nextStatus)
  } catch (err) {
    console.error('Failed to update status', err)
    errorMessage.value = 'Unable to update task status.'
  }
}

async function removeTask(task: TeamTask) {
  if (!window.confirm(`Delete task "${task.title}"?`)) return
  try {
    await taskStore.remove(task.id)
  } catch (err) {
    console.error('Failed to delete task', err)
    errorMessage.value = 'Unable to delete task.'
  }
}

async function toggleVoiceCapture() {
  if (!orgId.value || !selectedProjectId.value) return
  errorMessage.value = null
  if (!isRecording.value) {
    try {
      voiceTranscript.value = ''
      await startRecording()
    } catch (err) {
      console.error('Voice capture failed to start', err)
      errorMessage.value = 'Unable to access microphone.'
    }
    return
  }

  creating.value = true
  try {
    await stopRecording()
    const title = voiceTranscript.value.trim()
    if (!title) return
    await taskStore.create(orgId.value, selectedProjectId.value, {
      title,
      status: 'pending',
      metadata: { source: 'voice' },
    })
    voiceTranscript.value = ''
  } catch (err) {
    console.error('Voice task creation failed', err)
    errorMessage.value = 'Failed to create task from voice.'
  } finally {
    creating.value = false
  }
}

async function onProgressChange(task: TeamTask, event: Event) {
  const target = event.target as HTMLInputElement
  const value = Number(target.value)
  if (Number.isNaN(value)) return
  try {
    await taskStore.update(task.id, { progress: value })
  } catch (err) {
    console.error('Failed to update progress', err)
    errorMessage.value = 'Unable to update progress.'
  }
}

function canClaim(task: TeamTask) {
  const userId = authStore.user?.uid
  if (!userId) return false
  if (!task.assignedTo) return true
  return task.assignedTo !== userId
}

function assignLabel(task: TeamTask) {
  const userId = authStore.user?.uid
  if (!task.assignedTo) return 'Claim Task'
  if (task.assignedTo === userId) return 'Assigned to you'
  return 'Reassign to me'
}

async function claimTask(task: TeamTask) {
  const userId = authStore.user?.uid
  if (!userId || !orgId.value || !selectedProjectId.value) return
  try {
    await taskStore.update(task.id, { assignedTo: userId })
    errorMessage.value = null
  } catch (err) {
    console.error('Failed to claim task', err)
    errorMessage.value = 'Unable to claim this task.'
  }
}

function formatDate(value: any) {
  if (!value) return ''
  try {
    if (typeof value === 'string') return new Date(value).toLocaleString()
    if (value.seconds) {
      return new Date(value.seconds * 1000).toLocaleString()
    }
    if (value.toDate) return value.toDate().toLocaleString()
    return new Date(value).toLocaleString()
  } catch {
    return ''
  }
}
</script>

<style scoped>
.team-tasks { display: flex; flex-direction: column; gap: 20px; }
.tasks-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; }
.tasks-header h1 { margin: 0; font-size: 1.6rem; }
.tasks-header p { margin: 4px 0 0; color: rgba(17,24,39,0.65); }
.project-picker select { padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(15,23,42,0.12); background: #fff; min-width: 220px; }
.task-input-card { display: flex; flex-direction: column; gap: 12px; background: #fff; border-radius: 16px; padding: 18px; border: 1px solid rgba(15,23,42,0.08); box-shadow: 0 8px 20px rgba(17,24,39,0.05); }
.task-input-card .inputs { display: flex; flex-direction: column; gap: 8px; }
.task-input-card input, .task-input-card textarea { border-radius: 10px; border: 1px solid rgba(15,23,42,0.12); padding: 10px 12px; font-size: 0.95rem; }
.task-input-card textarea { resize: vertical; }
.quick-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.quick-actions button { border: none; border-radius: 999px; padding: 10px 18px; font-weight: 600; cursor: pointer; transition: transform 0.16s ease; }
.quick-actions button:disabled { cursor: not-allowed; opacity: 0.6; transform: none; }
.quick-actions button:not(:disabled):hover { transform: translateY(-1px); }
.quick-actions .primary { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; }
.quick-actions .voice { background: rgba(79,70,229,0.14); color: #4338ca; }
.voice-preview { margin: 0; font-size: 0.9rem; color: rgba(17,24,39,0.7); }
.voice-preview span { font-weight: 600; margin-right: 6px; }
.error { margin: 0; font-size: 0.9rem; color: #dc2626; }
.tasks-loading, .tasks-empty { background: #fff; border: 1px dashed rgba(15,23,42,0.15); border-radius: 14px; padding: 28px; text-align: center; color: rgba(17,24,39,0.6); }
.tasks-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.task-item { background: #fff; border-radius: 16px; padding: 16px; border: 1px solid rgba(15,23,42,0.08); display: flex; flex-direction: column; gap: 12px; }
.task-title { display: flex; align-items: center; gap: 10px; font-weight: 600; color: #111827; }
.task-title input { width: 18px; height: 18px; }
.task-title .done { text-decoration: line-through; color: rgba(17,24,39,0.45); }
.task-meta { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(79,70,229,0.12); color: #312e81; padding: 4px 10px; border-radius: 999px; font-size: 0.8rem; font-weight: 500; }
.chip.due { background: rgba(16,185,129,0.15); color: #0f766e; }
.chip.status.pending { background: rgba(251,191,36,0.18); color: #92400e; }
.chip.status.completed { background: rgba(52,211,153,0.18); color: #047857; }
.chip.progress { background: rgba(79,70,229,0.18); color: #4338ca; }
.task-description { margin: 0; color: rgba(17,24,39,0.7); font-size: 0.92rem; line-height: 1.4; }
.task-note { margin: 0; font-size: 0.88rem; color: rgba(17,24,39,0.6); background: rgba(15,23,42,0.04); padding: 8px 10px; border-radius: 10px; }
.task-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.slider-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: rgba(17,24,39,0.65); }
.slider-label input { width: 160px; }
.assign-btn { border: none; border-radius: 8px; padding: 8px 12px; background: rgba(79,70,229,0.16); color: #4338ca; font-weight: 600; cursor: pointer; }
.assign-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.task-actions { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: rgba(17,24,39,0.5); }
.task-actions .danger { border: none; background: none; color: #dc2626; font-weight: 600; cursor: pointer; }
.task-actions .danger:hover { text-decoration: underline; }
.timestamp { font-style: italic; }

@media (max-width: 768px) {
  .tasks-header { align-items: flex-start; }
  .project-picker select { width: 100%; }
  .task-actions { flex-direction: column; gap: 8px; align-items: flex-start; }
}
</style>
