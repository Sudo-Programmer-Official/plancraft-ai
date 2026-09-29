<template>
  <section class="today" aria-labelledby="today-greeting">
    <div class="today__mobile-header" aria-label="PlanCraft app header">
      <RouterLink to="/today" class="today__brand" aria-label="PlanCraftAI home">
        <img src="/plancraft-mark.svg" alt="" class="today__brand-mark" />
        <span class="today__brand-name">PlanCraftAI</span>
      </RouterLink>

      <div class="today__header-actions">
        <button type="button" class="today__header-icon" aria-label="Open voice planner" @click="router.push('/talk-to-planner')">
          <Mic2 :size="19" stroke-width="2.2" aria-hidden="true" />
        </button>
        <button type="button" class="today__avatar-button" aria-label="Open profile settings" @click="router.push('/settings')">
          <UserAvatar
            :src="authStore.user?.photoURL || authStore.user?.avatarUrl"
            :name="authStore.user?.displayName || authStore.user?.name"
            :email="authStore.user?.email"
            alt="Profile avatar"
            size-class="h-9 w-9"
            text-class="text-xs"
          />
        </button>
      </div>
    </div>

    <header class="today__head">
      <div>
        <h1 id="today-greeting" class="today__greeting">{{ greeting }}{{ firstName ? `, ${firstName}` : '' }}</h1>
        <p class="today__date">{{ todayLabel }}</p>
      </div>
    </header>

    <button v-if="showSetupNudge" type="button" class="today__setup" @click="quickSetupStore.openQuickSetup({ source: 'manual' })">
      <BellRing :size="16" aria-hidden="true" />
      <span>Finish setup so reminders reach you</span>
      <ChevronRight :size="16" aria-hidden="true" />
    </button>

    <h2 class="today__question">What matters today?</h2>

    <div v-if="loading && !todayTasks.length" class="today__skeleton" aria-hidden="true">
      <span v-for="n in 3" :key="n"></span>
    </div>

    <div v-else-if="!todayTasks.length" class="today__empty">
      <p>Nothing planned yet.</p>
      <PcButton variant="primary" :icon="Sparkles" @click="openCapture">Plan my day</PcButton>
    </div>

    <template v-else>
      <div class="today__list">
        <PcTaskRow
          v-for="task in openTasks"
          :key="task.id"
          :title="task.title || 'Untitled task'"
          :time="formatTime(task)"
          :meta="metaFor(task)"
          :done="false"
          @toggle="complete(task)"
          @open="openTask(task)"
        >
          <template #action>
            <PcButton size="sm" :icon="Play" @click="startFocus(task)">Focus</PcButton>
          </template>
        </PcTaskRow>
      </div>

      <PcButton variant="ghost" :icon="Plus" class="today__add" @click="openCapture">Add task</PcButton>

      <div v-if="doneTasks.length" class="today__done">
        <h3 class="today__done-title">Done · {{ doneTasks.length }}</h3>
        <PcTaskRow
          v-for="task in doneTasks"
          :key="task.id"
          :title="task.title || 'Untitled task'"
          :time="formatTime(task)"
          done
          @toggle="complete(task)"
          @open="openTask(task)"
        />
      </div>

      <section class="today__assistant" aria-label="PlanCraft suggestion">
        <p class="today__assistant-name"><Sparkles :size="16" aria-hidden="true" /> PlanCraft</p>
        <p class="today__assistant-text">{{ assistantLine }}</p>
        <ol v-if="planLines.length" class="today__plan">
          <li v-for="(line, index) in planLines" :key="index">{{ line }}</li>
        </ol>
        <p v-if="planError" class="today__error" role="alert">{{ planError }}</p>
        <PcButton v-if="openTasks.length" variant="primary" :loading="planning" @click="planRestOfDay">
          {{ planLabel }}
        </PcButton>
      </section>
    </template>

    <PcSheet
      :open="!!activeTask"
      :title="activeTask?.title || 'Task'"
      :subtitle="activeTask ? sheetSubtitle(activeTask) : ''"
      @update:open="(open) => !open && closeTask()"
    >
      <template #actions>
        <PcMenu :items="taskMenu" @select="onMenu" />
      </template>

      <form v-if="activeTask && editing" class="today__edit" @submit.prevent="saveEdit">
        <label class="today__field">
          <span>Title</span>
          <input v-model="draft.title" required class="today__input" />
        </label>
        <label class="today__field">
          <span>Notes</span>
          <textarea v-model="draft.details" rows="4" class="today__input"></textarea>
        </label>
        <label class="today__field">
          <span>Reminder time</span>
          <input v-model="draft.time" type="time" class="today__input" />
          <small class="today__hint">Leave empty for no reminder.</small>
        </label>
        <div class="today__edit-actions">
          <PcButton type="submit" variant="primary" :loading="saving">Save</PcButton>
          <PcButton variant="ghost" @click="editing = false">Cancel</PcButton>
        </div>
      </form>

      <div v-else-if="activeTask" class="today__detail">
        <p v-if="metaFor(activeTask)" class="today__tag">{{ metaFor(activeTask) }}</p>
        <template v-if="!activeTask.completed">
          <p class="today__prompt"><Sparkles :size="16" aria-hidden="true" /> What would you like to do?</p>
          <div class="today__detail-actions">
            <PcButton variant="primary" size="lg" block :icon="Play" @click="startFocus(activeTask)">Focus</PcButton>
            <PcButton size="lg" block :icon="Sparkles" :loading="helping" @click="helpMe(activeTask)">Help me</PcButton>
          </div>
          <div v-if="helpSteps.length || helpError" class="today__help" aria-live="polite">
            <p v-if="helpSteps.length" class="today__help-title">Here’s how I’d approach it</p>
            <ol v-if="helpSteps.length">
              <li v-for="(step, index) in helpSteps" :key="index">{{ step }}</li>
            </ol>
            <p v-if="helpError" class="today__error" role="alert">{{ helpError }}</p>
          </div>
        </template>
        <dl class="today__facts">
          <div>
            <dt>Notes</dt>
            <dd>{{ activeTask.details || activeTask.notes || 'No notes yet.' }}</dd>
          </div>
          <div v-if="formatTime(activeTask)">
            <dt>Reminder</dt>
            <dd>{{ formatTime(activeTask) }}</dd>
          </div>
        </dl>
      </div>

      <template v-if="activeTask && !editing" #footer>
        <PcButton variant="ghost" block :icon="activeTask.completed ? RotateCcw : CircleCheck" @click="complete(activeTask, true)">
          {{ activeTask.completed ? 'Mark not done' : 'Mark complete' }}
        </PcButton>
      </template>
    </PcSheet>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { BellRing, CalendarArrowUp, ChevronRight, CircleCheck, Copy, Mic2, Pencil, Play, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-vue-next'
import { PcButton, PcMenu, PcSheet, PcTaskRow } from '@/design'
import UserAvatar from '@/components/UserAvatar.vue'
import { useTasks } from '@/composables/useTasks'
import { useCaptureSheet } from '@/composables/useCaptureSheet'
import { useDayClock } from '@/composables/useDayClock'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { useAuthStore } from '@/stores/authStore'
import { useFocusStore } from '@/stores/focusStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { askWorkspaceSummary } from '@/services/workspaceAiService'
import { updateTaskInFirebase } from '@/services/firebaseService'
import { scheduleReminder } from '@/services/reminderService'
import { getPreferences } from '@/services/settingsService'
import api from '@/services/api'
import { useQuickSetupStore } from '@/stores/quickSetupStore'
import { buildLocalIso } from '@/utils/timeHelper.js'
import { toLocalDateKey } from '@/utils/dateHelper'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

const { openCapture } = useCaptureSheet()
const router = useRouter()
useSeoMeta({ title: 'Today | PlanCraft AI', description: 'Your day in PlanCraft AI.', canonicalPath: '/today', noindex: true })

const authStore = useAuthStore()
const focus = useFocusStore()
const workspaceStore = useWorkspaceStore()
const quickSetupStore = useQuickSetupStore()
const { now } = useDayClock()
const { allTasks, loadTasksForDate, toggleComplete, addTask, deleteTask, moveTasks, mergeTasksLocally, getTaskPlannedDate } = useTasks()

const loading = ref(true)
const activeTaskId = ref(null)
const editing = ref(false)
const saving = ref(false)
const draft = reactive({ title: '', details: '', time: '' })
const helping = ref(false)
const helpSteps = ref([])
const helpError = ref('')
const planning = ref(false)
const planLines = ref([])
const planError = ref('')

const todayKey = computed(() => toLocalDateKey(now.value))
const firstName = computed(() => String(authStore.user?.displayName || authStore.user?.name || '').trim().split(/\s+/)[0] || '')
const hour = computed(() => now.value.getHours())
const greeting = computed(() => (hour.value < 12 ? 'Good morning' : hour.value < 18 ? 'Good afternoon' : 'Good evening'))
const todayLabel = computed(() => new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: getEffectiveUserTimezone(),
}).format(now.value))
const planLabel = computed(() => (hour.value < 12 ? 'Plan my day' : hour.value < 18 ? 'Plan my afternoon' : 'Plan my evening'))

// Read from the shared store so Focus completions and other screens stay in sync.
const todayTasks = computed(() => allTasks.value.filter((task) => getTaskPlannedDate(task) === todayKey.value))
const byTime = (a, b) => String(a.reminderTime || '99:99').localeCompare(String(b.reminderTime || '99:99'))
const openTasks = computed(() => todayTasks.value.filter((task) => !task.completed).sort(byTime))
const doneTasks = computed(() => todayTasks.value.filter((task) => task.completed).sort(byTime))
// No saved state yet means a new user who hasn't set up (same rule the dashboard used).
const showSetupNudge = computed(
  () => authStore.guest !== true && authStore.user?.mode !== 'guest' && quickSetupStore.setupState?.completed !== true,
)
const activeTask = computed(() => allTasks.value.find((task) => task.id === activeTaskId.value) || null)
const assistantLine = computed(() => {
  const left = openTasks.value.length
  if (!left) return 'Everything for today is done. Nice work.'
  return `You have ${left} ${left === 1 ? 'task' : 'tasks'} left today.`
})

const taskMenu = [
  { key: 'edit', label: 'Edit', icon: Pencil },
  { key: 'tomorrow', label: 'Move to tomorrow', icon: CalendarArrowUp },
  { key: 'duplicate', label: 'Duplicate', icon: Copy },
  { key: 'delete', label: 'Delete', icon: Trash2, danger: true, dividerBefore: true },
]

function formatTime(task) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(task?.reminderTime || ''))
  if (!match) return ''
  const date = new Date()
  date.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: getEffectiveUserTimezone(),
  }).format(date)
}

function metaFor(task) {
  // Catch-all buckets carry no information on Today.
  const category = String(task?.category || '').trim()
  return category && !['Uncategorized', 'Other'].includes(category) ? category : ''
}

function sheetSubtitle(task) {
  const time = formatTime(task)
  return time ? `Today · ${time}` : 'Today'
}

function openTask(task) {
  activeTaskId.value = task.id
  editing.value = false
  helpSteps.value = []
  helpError.value = ''
}

function closeTask() {
  activeTaskId.value = null
  editing.value = false
}

async function complete(task, fromSheet = false) {
  await toggleComplete(task)
  if (fromSheet && task.completed) closeTask()
}

function startFocus(task) {
  if (focus.isOpen) {
    ElMessage.info('Finish your current focus session first.')
    return
  }
  focus.open(task, authStore.user?.uid)
  closeTask()
}

async function helpMe(task) {
  const workspaceId = workspaceStore.activeWorkspaceId
  helping.value = true
  helpError.value = ''
  try {
    const { answer } = await askWorkspaceSummary({
      workspaceId,
      question: `Break this task into 3 to 5 short, concrete steps. Reply with one step per line and nothing else.\nTask: ${task.title}\nNotes: ${task.details || 'none'}`,
    })
    helpSteps.value = toLines(answer).slice(0, 5)
    if (!helpSteps.value.length) helpError.value = 'I couldn’t come up with steps for this one. Try adding a note.'
  } catch {
    helpError.value = 'Help isn’t available right now. Please try again.'
  } finally {
    helping.value = false
  }
}

async function planRestOfDay() {
  planning.value = true
  planError.value = ''
  try {
    const { answer } = await askWorkspaceSummary({
      workspaceId: workspaceStore.activeWorkspaceId,
      question: `It is ${new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: getEffectiveUserTimezone(),
      }).format(now.value)}. Plan the rest of my day from my open tasks: suggest an order with rough times. Reply with one short line per step.`,
    })
    planLines.value = toLines(answer).slice(0, 6)
    if (!planLines.value.length) planError.value = 'No plan came back. Please try again.'
  } catch {
    planError.value = 'Planning isn’t available right now. Please try again.'
  } finally {
    planning.value = false
  }
}

// Strip list markers the model may add ("1.", "-", "•").
function toLines(text) {
  return String(text || '')
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim())
    .filter(Boolean)
}

async function onMenu(key) {
  const task = activeTask.value
  if (!task) return
  if (key === 'edit') {
    draft.title = task.title || ''
    draft.details = task.details || ''
    draft.time = /^\d{1,2}:\d{2}/.test(String(task.reminderTime || '')) ? String(task.reminderTime).slice(0, 5) : ''
    editing.value = true
  } else if (key === 'tomorrow') {
    const tomorrow = new Date(now.value)
    tomorrow.setDate(tomorrow.getDate() + 1)
    await moveTasks([task], toLocalDateKey(tomorrow))
    closeTask()
    ElMessage.success('Moved to tomorrow')
  } else if (key === 'duplicate') {
    await addTask({ title: task.title, details: task.details || '', category: task.category, date: todayKey.value, source: 'today_duplicate' })
    ElMessage.success('Duplicated')
  } else if (key === 'delete') {
    try {
      await ElMessageBox.confirm(`Delete “${task.title}”? This can’t be undone.`, 'Delete task', {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      })
    } catch {
      return
    }
    await deleteTask(task)
    closeTask()
    ElMessage.success('Deleted')
  }
}

async function saveEdit() {
  const task = activeTask.value
  if (!task || !draft.title.trim()) return
  const nextTime = draft.time || null
  const timeChanged = nextTime !== (String(task.reminderTime || '').slice(0, 5) || null)
  saving.value = true
  try {
    const updated = {
      ...task,
      title: draft.title.trim(),
      details: draft.details,
      reminderTime: nextTime,
      // A stored scheduledTime wins over date + reminderTime, so drop it when the time changes.
      ...(timeChanged ? { scheduledTime: null } : {}),
    }
    await updateTaskInFirebase(updated)
    mergeTasksLocally([updated])
    editing.value = false
    if (timeChanged) await syncReminder(updated)
  } catch {
    ElMessage.error('Could not save changes. Please try again.')
  } finally {
    saving.value = false
  }
}

// Same flow as TaskDialog: schedule with the user's channels, or cancel.
async function syncReminder(task) {
  const uid = authStore.user?.uid
  if (!uid || !task?.id) return
  try {
    if (task.reminderTime) {
      const iso = buildLocalIso(task.date, task.reminderTime)
      const prefs = (await getPreferences(uid).catch(() => ({})))?.notifications || {}
      const result = await scheduleReminder(uid, task.id, task.title, iso, prefs)
      if (result?.ok === false) ElMessage.warning('Saved, but the reminder couldn’t be updated. Try again later.')
    } else {
      await api.post('/reminders/cancel', { userId: uid, taskId: task.id })
    }
  } catch {
    ElMessage.warning('Saved, but the reminder couldn’t be updated. Try again later.')
  }
}

onMounted(async () => {
  try {
    await loadTasksForDate(todayKey.value)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.today {
  max-width: 40rem;
  margin: 0 auto;
  padding: 0 var(--pc-space-4) var(--pc-space-6);
}

.today__mobile-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-3);
  min-height: 4rem;
  margin: 0 calc(-1 * var(--pc-space-4)) var(--pc-space-4);
  padding: calc(env(safe-area-inset-top) + 0.75rem) var(--pc-space-4) 0.75rem;
  border-bottom: 1px solid var(--pc-border);
  background: var(--pc-surface);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(14px);
}

.today__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.6rem;
  color: var(--pc-text);
  font-size: var(--pc-text-body);
  font-weight: 700;
  text-decoration: none;
}

.today__brand-mark {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
}

.today__brand-name {
  white-space: nowrap;
}

.today__header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--pc-space-2);
}

.today__header-icon,
.today__avatar-button {
  display: grid;
  place-items: center;
  border: 0;
  color: var(--pc-accent-text);
  cursor: pointer;
}

.today__header-icon {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--pc-border-strong);
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent-soft);
}

.today__header-icon:hover {
  border-color: var(--pc-accent);
  background: var(--pc-accent-soft);
}

.today__avatar-button {
  padding: 0;
  border-radius: var(--pc-radius-full);
  background: transparent;
}

.today__avatar-button:focus-visible,
.today__header-icon:focus-visible,
.today__brand:focus-visible {
  outline: 2px solid var(--pc-accent);
  outline-offset: 3px;
}

.today__greeting {
  margin: 0;
  font-size: var(--pc-text-display);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.today__date {
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text-muted);
}

.today__setup {
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-2);
  margin-top: var(--pc-space-4);
  padding: var(--pc-space-2) var(--pc-space-3);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-full);
  background: var(--pc-surface);
  color: var(--pc-accent-text);
  font-family: var(--pc-font);
  font-size: var(--pc-text-small);
  font-weight: 600;
  cursor: pointer;
}

.today__setup:hover {
  border-color: var(--pc-accent);
}

.today__hint {
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-caption);
  font-weight: 400;
}

.today__question {
  margin: var(--pc-space-10) 0 var(--pc-space-3);
  padding-bottom: var(--pc-space-3);
  border-bottom: 1px solid var(--pc-border);
  font-size: var(--pc-text-body-lg);
  font-weight: 600;
}

.today__list {
  display: grid;
  gap: var(--pc-space-1);
  margin: 0 calc(-1 * var(--pc-space-2));
}

.today__add {
  margin-top: var(--pc-space-3);
}

.today__skeleton {
  display: grid;
  gap: var(--pc-space-3);
}

.today__skeleton span {
  height: 2.75rem;
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface-2);
  animation: today-pulse 1.4s ease-in-out infinite;
}

@keyframes today-pulse {
  50% {
    opacity: 0.55;
  }
}

@media (min-width: 768px) {
  .today {
    padding-top: var(--pc-space-8);
  }

  .today__mobile-header {
    display: none;
  }
}

@media (max-width: 767px) {
  .today {
    width: 100%;
    max-width: none;
    box-sizing: border-box;
  }
}

.today__empty {
  display: grid;
  justify-items: start;
  gap: var(--pc-space-4);
  padding: var(--pc-space-6) 0;
  color: var(--pc-text-muted);
}

.today__empty p {
  margin: 0;
}

.today__done {
  margin-top: var(--pc-space-8);
}

.today__done-title {
  margin: 0 0 var(--pc-space-2);
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-small);
  font-weight: 600;
}

.today__done :deep(.pc-task-row) {
  margin: 0 calc(-1 * var(--pc-space-2));
}

.today__assistant {
  display: grid;
  justify-items: start;
  gap: var(--pc-space-2);
  margin-top: var(--pc-space-10);
  padding-top: var(--pc-space-5);
  border-top: 1px solid var(--pc-border);
}

.today__assistant-name,
.today__prompt {
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-2);
  margin: 0;
  font-size: var(--pc-text-small);
}

.today__assistant-name {
  color: var(--pc-accent-text);
  font-weight: 600;
}

.today__assistant-text {
  margin: 0 0 var(--pc-space-2);
}

.today__plan,
.today__help ol {
  display: grid;
  gap: var(--pc-space-2);
  margin: 0 0 var(--pc-space-2);
  padding-left: 1.25rem;
  color: var(--pc-text);
}

.today__error {
  margin: 0;
  color: var(--pc-danger);
  font-size: var(--pc-text-small);
}

.today__detail {
  display: grid;
  gap: var(--pc-space-5);
}

.today__tag {
  justify-self: start;
  margin: 0;
  padding: 2px var(--pc-space-2);
  border-radius: var(--pc-radius-full);
  background: var(--pc-surface-2);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
  font-weight: 600;
}

.today__prompt {
  color: var(--pc-text-muted);
}

.today__detail-actions {
  display: grid;
  gap: var(--pc-space-2);
}

.today__help {
  padding: var(--pc-space-4);
  border-radius: var(--pc-radius-md);
  background: var(--pc-accent-soft);
}

.today__help-title {
  margin: 0 0 var(--pc-space-2);
  color: var(--pc-accent-text);
  font-size: var(--pc-text-small);
  font-weight: 600;
}

.today__facts {
  display: grid;
  gap: var(--pc-space-4);
  margin: 0;
  padding-top: var(--pc-space-5);
  border-top: 1px solid var(--pc-border);
}

.today__facts dt {
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
  font-weight: 600;
}

.today__facts dd {
  margin: var(--pc-space-1) 0 0;
  white-space: pre-wrap;
}

.today__edit {
  display: grid;
  gap: var(--pc-space-4);
}

.today__field {
  display: grid;
  gap: var(--pc-space-1);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  font-weight: 600;
}

.today__input {
  width: 100%;
  padding: var(--pc-space-3);
  border: 1px solid var(--pc-border-strong);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-text);
  font-family: var(--pc-font);
  font-size: 1rem;
  font-weight: 400;
  resize: vertical;
}

.today__input:focus {
  outline: none;
  border-color: var(--pc-accent);
  box-shadow: 0 0 0 3px var(--pc-accent-soft);
}

.today__edit-actions {
  display: flex;
  gap: var(--pc-space-2);
}
</style>
