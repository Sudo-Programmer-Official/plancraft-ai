<template>
  <section class="meeting-detail" v-if="meeting">
    <header class="detail-header">
      <div>
        <h1>{{ meeting.title }}</h1>
        <p>{{ formatDate(meeting.startAt) }}</p>
      </div>
      <button type="button" @click="goBack">← Back</button>
    </header>

    <form class="transcript-form" @submit.prevent="commit">
      <label>
        Transcript
        <textarea v-model="transcript" rows="8" placeholder="Paste transcript"></textarea>
      </label>

      <label>
        Summary (optional)
        <textarea v-model="summary" rows="3" placeholder="Short summary"></textarea>
      </label>

      <div class="form-actions">
        <button type="button" @click="preview" :disabled="previewing || !canSubmit">
          {{ previewing ? 'Generating…' : 'Preview Tasks' }}
        </button>
        <button type="submit" :disabled="committing || !canSubmit">
          {{ committing ? 'Committing…' : 'Commit Transcript' }}
        </button>
      </div>
    </form>

    <section class="preview" v-if="tasksPreview.length">
      <h2>Generated Tasks (preview)</h2>
      <ul>
        <li v-for="(task, idx) in tasksPreview" :key="idx">
          <strong>{{ task.title }}</strong>
          <span class="meta">{{ task.status }} · {{ task.priority }}</span>
          <p v-if="task.description">{{ task.description }}</p>
        </li>
      </ul>
    </section>

    <p v-if="!tasksPreview.length && previewed" class="empty-preview">
      No tasks suggested yet. Adjust the transcript or summary and try again.
    </p>
  </section>

  <div v-else class="meeting-missing">
    <p>Meeting not found.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrgStore } from '../stores/orgStore'
import { useMeetingStore } from '../stores/meetingStore'

const route = useRoute()
const router = useRouter()
const orgStore = useOrgStore()
const meetingStore = useMeetingStore()

const meetingIdParam = route.params.meetingId
const meetingId = typeof meetingIdParam === 'string' ? meetingIdParam : Array.isArray(meetingIdParam) ? meetingIdParam[0] : ''

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const meeting = computed(() => (meetingId ? meetingStore.getById(meetingId) : null))

interface PreviewTask {
  title: string
  description?: string
  status?: string
  priority?: string
  due?: string | null
}

const transcript = ref('')
const summary = ref('')
const tasksPreview = ref<PreviewTask[]>([])
const previewed = ref(false)
const previewing = ref(false)
const committing = ref(false)
const skipReset = ref(false)

const canSubmit = computed(() => Boolean(transcript.value || summary.value))

watch(meeting, (value) => {
  if (!value) return
  summary.value = typeof value.summary === 'string' ? value.summary : ''
  transcript.value = typeof value.transcript === 'string' ? value.transcript : ''
  tasksPreview.value = Array.isArray(value.generatedTaskPreview) ? value.generatedTaskPreview : []
  previewed.value = tasksPreview.value.length > 0
  skipReset.value = true
}, { immediate: true })

watch([transcript, summary], ([nextTranscript, nextSummary], [prevTranscript, prevSummary]) => {
  if (skipReset.value) {
    skipReset.value = false
    return
  }
  if (nextTranscript !== prevTranscript || nextSummary !== prevSummary) {
    previewed.value = false
    tasksPreview.value = []
  }
})

watch(orgId, async (id) => {
  if (!id) return
  orgStore.setOrg(id)
  if (!meeting.value) {
    await meetingStore.load(id)
  }
}, { immediate: true })

function formatDate(value: any) {
  if (!value) return 'No scheduled time'
  try {
    const date = value instanceof Date ? value : new Date(value)
    return date.toLocaleString()
  } catch {
    return value
  }
}

async function preview() {
  if (!orgId.value || !meetingId || !canSubmit.value) return
  previewing.value = true
  try {
    const tasks = await meetingStore.previewTranscript(orgId.value, meetingId, {
      transcript: transcript.value,
      summary: summary.value,
    })
    tasksPreview.value = tasks
    previewed.value = true
  } catch (err) {
    console.error('preview error', err)
    window.alert('Failed to generate preview. Please try again.')
  } finally {
    previewing.value = false
  }
}

async function commit() {
  if (!orgId.value || !meetingId || !canSubmit.value) return
  committing.value = true
  try {
    await meetingStore.attachTranscript(orgId.value, meetingId, {
      transcript: transcript.value,
      summary: summary.value,
    })
    tasksPreview.value = []
    previewed.value = false
    router.push({ name: 'team-automations', params: { orgId: orgId.value } })
  } catch (err) {
    console.error('commit error', err)
    window.alert('Failed to commit transcript. Please retry.')
  } finally {
    committing.value = false
  }
}

function goBack() {
  router.back()
}

watch(meeting, (value) => {
  if (!value) return
  summary.value = typeof value.summary === 'string' ? value.summary : ''
  transcript.value = typeof value.transcript === 'string' ? value.transcript : ''
  tasksPreview.value = Array.isArray(value.generatedTaskPreview) ? value.generatedTaskPreview : []
  previewed.value = tasksPreview.value.length > 0
}, { immediate: true })
</script>

<style scoped>
.meeting-detail { display: flex; flex-direction: column; gap: 20px; padding: 16px; }
.detail-header { display: flex; justify-content: space-between; align-items: center; }
.detail-header button { padding: 6px 12px; border: none; background: #111; color: #fff; border-radius: 6px; cursor: pointer; }
.transcript-form { display: flex; flex-direction: column; gap: 14px; }
textarea { width: 100%; border-radius: 8px; border: 1px solid rgba(0,0,0,0.2); padding: 10px; font-family: inherit; }
.form-actions { display: flex; gap: 12px; }
.form-actions button { padding: 8px 16px; border: none; border-radius: 6px; background: #111; color: #fff; cursor: pointer; }
.form-actions button[disabled] { background: rgba(0,0,0,0.3); cursor: not-allowed; }
.preview ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.preview li { border: 1px solid rgba(0,0,0,0.15); border-radius: 10px; padding: 12px; background: #fff; }
.meta { font-size: 0.8rem; color: rgba(0,0,0,0.6); margin-left: 8px; }
.empty-preview { padding: 12px; border-radius: 8px; border: 1px dashed rgba(0,0,0,0.3); text-align: center; color: rgba(0,0,0,0.7); }
.meeting-missing { padding: 24px; text-align: center; color: rgba(0,0,0,0.6); }
</style>
