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
      <TransitionGroup name="today-task" tag="div" class="today__list">
        <PcTaskRow
          v-for="task in openTasks"
          :key="task.id"
          :title="task.title || 'Untitled task'"
          :meta="rowMetaFor(task)"
          :done="false"
          @toggle="complete(task)"
          @open="openTask(task)"
        >
          <template #action>
            <span class="today__row-menu" @click.stop="trackTaskOverflow(task)">
              <PcMenu :items="taskMenu" label="Task management" @select="(key) => onMenu(key, task)" />
            </span>
          </template>
        </PcTaskRow>
      </TransitionGroup>

      <PcButton variant="ghost" :icon="Plus" class="today__add" @click="openCapture">Add task</PcButton>

      <div v-if="doneTasks.length" class="today__done">
        <button
          type="button"
          class="today__done-toggle"
          :aria-expanded="showCompleted"
          @click="showCompleted = !showCompleted"
        >
          <span>✓ {{ doneTasks.length }} completed</span>
          <ChevronDown :size="17" :class="{ 'today__done-chevron--open': showCompleted }" aria-hidden="true" />
        </button>
        <div v-if="showCompleted" class="today__done-list">
          <PcTaskRow
            v-for="task in doneTasks"
            :key="task.id"
            :title="task.title || 'Untitled task'"
            :meta="rowMetaFor(task)"
            done
            @toggle="complete(task)"
            @open="openTask(task)"
          >
            <template #action>
              <span class="today__row-menu" @click.stop="trackTaskOverflow(task)">
                <PcMenu :items="taskMenu" label="Task management" @select="(key) => onMenu(key, task)" />
              </span>
            </template>
          </PcTaskRow>
        </div>
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
        <PcMenu :items="taskMenu" @select="onSheetMenu" />
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
          <span>Date</span>
          <input v-model="draft.date" type="date" class="today__input" />
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
        <p v-if="rowMetaFor(activeTask)" class="today__tag">{{ rowMetaFor(activeTask) }}</p>
        <template v-if="!activeTask.completed">
          <p class="today__prompt"><Sparkles :size="16" aria-hidden="true" /> How can PlanCraft help?</p>
          <section v-if="nextTaskAction" class="today__next-action" aria-labelledby="today-next-action-title">
            <div class="today__next-action-copy">
              <p class="today__research-eyebrow">Next best move</p>
              <h3 id="today-next-action-title">{{ nextTaskAction.title }}</h3>
              <p>{{ nextTaskAction.description }}</p>
            </div>
            <button type="button" class="today__next-action-button" @click="runNextTaskAction">
              <component :is="nextTaskAction.icon" :size="17" aria-hidden="true" />
              <span>{{ nextTaskAction.cta }}</span>
              <ArrowUpRight :size="16" aria-hidden="true" />
            </button>
          </section>
          <div class="today__suggestions">
            <button
              v-for="action in taskActionSuggestions"
              :key="action.key"
              type="button"
              class="today__suggestion"
              :disabled="helping"
              :aria-busy="helping && helpActionKey === action.key"
              @click="selectTaskAction(action.key)"
            >
              <component :is="action.icon" :size="18" aria-hidden="true" />
              <span class="today__suggestion-copy">
                <strong>{{ action.label }}</strong>
                <small>{{ action.description }}</small>
              </span>
              <span class="today__suggestion-arrow" aria-hidden="true">→</span>
            </button>
          </div>
          <div class="today__focus-action">
            <PcButton variant="ghost" block :icon="Play" @click="startFocus(activeTask)">Focus 25 min</PcButton>
          </div>
          <section v-if="intelligenceEnabled" class="today__research" aria-labelledby="today-task-research-title">
            <div class="today__research-head">
              <div>
                <p class="today__research-eyebrow"><Sparkles :size="15" aria-hidden="true" /> Live task intelligence</p>
                <h3 id="today-task-research-title">Bring a current answer into this task</h3>
                <p>Ask one of your research agents to check fresh public sources. Nothing runs automatically.</p>
              </div>
              <span class="today__premium-badge">Premium</span>
            </div>

            <div v-if="isPremium" class="today__research-controls">
              <label class="today__research-field">
                <span>Agent</span>
                <select v-model="taskResearchAgentId" :disabled="taskResearchLoading || taskResearchMemoryLoading" class="today__research-select" @focus="loadTaskResearchAgents">
                  <option v-for="agent in taskResearchAgents" :key="agent.id" :value="agent.id">
                    {{ agent.label || agent.name }}{{ agent.id === 'general-task-helper' ? ' · Default' : agent.custom ? ' · Mine' : '' }}
                  </option>
                </select>
              </label>
              <label class="today__research-field today__research-field--question">
                <span>Optional question</span>
                <input
                  v-model="taskResearchQuestion"
                  class="today__research-input"
                  :disabled="taskResearchLoading || taskResearchMemoryLoading"
                  placeholder="What should I know before I start?"
                  @keydown.enter.prevent="runTaskResearch"
                />
              </label>
            </div>

            <button
              type="button"
              class="today__research-button"
              :disabled="taskResearchLoading || taskResearchMemoryLoading"
              :aria-busy="taskResearchLoading || taskResearchMemoryLoading"
              @click="runTaskResearch"
            >
              <RefreshCw :size="16" :class="{ 'today__research-spin': taskResearchLoading || taskResearchMemoryLoading }" aria-hidden="true" />
              {{ taskResearchMemoryLoading ? 'Loading saved answer…' : taskResearchLoading ? 'Researching live sources…' : !isPremium ? 'Unlock live research' : taskResearchResult ? 'Refresh live answer' : 'Research this task' }}
              <ArrowUpRight :size="16" aria-hidden="true" />
            </button>

            <div v-if="!isPremium" class="today__research-locked">
              <p>Live, source-backed task research is included with Premium Intelligence.</p>
              <button type="button" @click="openPremium">Unlock Premium Intelligence</button>
            </div>

            <div v-if="taskResearchError" class="today__research-error" role="alert">
              {{ taskResearchError }}
            </div>

            <article v-if="taskResearchResult" class="today__research-result" aria-live="polite">
              <div class="today__research-result-head">
                <div>
                  <p class="today__research-eyebrow">Agent answer</p>
                  <p class="today__research-result-meta">
                    {{ taskResearchResult.agentLabel || 'Intelligence agent' }} · {{ taskResearchResult.persisted ? 'saved research memory' : taskResearchResult.cached ? 'cached source set' : 'fresh web research' }}
                  </p>
                </div>
                <time v-if="taskResearchResult.generatedAt" :datetime="taskResearchResult.generatedAt">
                  {{ formatResearchTime(taskResearchResult.generatedAt) }}
                </time>
              </div>
              <div class="today__research-answer" v-html="renderIntelligenceMarkdown(taskResearchResult.synthesis)" />
              <details v-if="taskResearchResult.sources?.length" class="today__research-sources">
                <summary>{{ taskResearchResult.sources.length }} cited sources</summary>
                <a
                  v-for="source in taskResearchResult.sources"
                  :key="source.url"
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{{ source.title || sourceDomain(source.url) }}</span>
                  <ArrowUpRight :size="14" aria-hidden="true" />
                </a>
              </details>
              <details v-if="taskResearchHistory.length > 1" class="today__research-history">
                <summary>{{ taskResearchHistory.length - 1 }} earlier answer{{ taskResearchHistory.length - 1 === 1 ? '' : 's' }}</summary>
                <button
                  v-for="version in taskResearchHistory.slice(1)"
                  :key="version.id || version.savedAt"
                  type="button"
                  @click="showTaskResearchVersion(version)"
                >
                  <span>{{ version.agentLabel || 'Intelligence agent' }}</span>
                  <time :datetime="version.savedAt || version.generatedAt">{{ formatResearchTime(version.savedAt || version.generatedAt) }}</time>
                </button>
              </details>
            </article>
          </section>
          <div v-if="helpSteps.length || helpError" class="today__help" aria-live="polite">
            <p v-if="helpSteps.length" class="today__help-title">
              {{ helpIsFallback ? 'Starter steps' : helpActionKey === 'help_prepare' ? 'A practical next step' : 'Suggested steps' }}
            </p>
            <p v-if="helpIsFallback" class="today__help-note">AI is unavailable for the moment, so these are useful general starting points.</p>
            <ol v-if="helpSteps.length">
              <li v-for="(step, index) in helpSteps" :key="index">{{ step }}</li>
            </ol>
            <p v-if="helpError" class="today__error" role="alert">{{ helpError }}</p>
            <div v-if="helpSteps.length" class="today__help-footer">
              <PcButton
                size="sm"
                variant="primary"
                :loading="applyingSteps"
                :disabled="helpApplied"
                @click="applyHelpSteps(activeTask)"
              >
                {{ helpApplied ? 'Added as subtasks' : 'Add as subtasks' }}
              </PcButton>
              <small>Nothing changes until you apply them.</small>
            </div>
            <PcButton v-if="helpError && !helping" size="sm" variant="ghost" @click="retryHelp">
              Try again
            </PcButton>
          </div>
        </template>
        <section v-if="activeTaskChildren.length" class="today__subtasks" aria-label="Subtasks">
          <div class="today__subtasks-heading">
            <span>Subtasks</span>
            <small>{{ activeTaskChildren.filter((task) => task.completed).length }}/{{ activeTaskChildren.length }}</small>
          </div>
          <PcTaskRow
            v-for="child in activeTaskChildren"
            :key="child.id"
            :title="child.title || 'Untitled subtask'"
            :meta="rowMetaFor(child)"
            :done="!!child.completed"
            @toggle="complete(child)"
            @open="openTask(child)"
          />
        </section>
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

    <Transition name="today-undo">
      <div v-if="undoState" class="today__undo" role="status" aria-live="polite">
        <span>Task completed</span>
        <button type="button" :disabled="undoing" :aria-busy="undoing" @click="undoCompletion">Undo</button>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, markRaw, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownIt from 'markdown-it'
import { Archive, ArrowUpRight, BellRing, CalendarArrowUp, ChevronDown, ChevronRight, CircleCheck, Copy, ListChecks, MapPin, Mic2, Pencil, Play, Plus, RefreshCw, RotateCcw, Sparkles, Trash2 } from 'lucide-vue-next'
import { PcButton, PcMenu, PcSheet, PcTaskRow } from '@/design'
import UserAvatar from '@/components/UserAvatar.vue'
import { useTasks } from '@/composables/useTasks'
import { useCaptureSheet } from '@/composables/useCaptureSheet'
import { useDayClock } from '@/composables/useDayClock'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { useIsPremium } from '@/composables/useIsPremium'
import { useAuthStore } from '@/stores/authStore'
import { useFocusStore } from '@/stores/focusStore'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { askWorkspaceSummary } from '@/services/workspaceAiService'
import { updateTaskInFirebase } from '@/services/firebaseService'
import {
  fetchIntelligenceAgents,
  fetchIntelligenceBrief,
  fetchTaskResearchMemory,
  saveTaskResearchMemory,
  INTELLIGENCE_AGENTS,
} from '@/services/intelligenceService'
import { useQuickSetupStore } from '@/stores/quickSetupStore'
import { toLocalDateKey } from '@/utils/dateHelper'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'
import { EVENTS, trackEvent } from '@/services/analytics'

const TASK_RESEARCH_CACHE_TTL_MS = 30 * 60 * 1000
const WORKSPACE_AI_CACHE_TTL_MS = 20 * 60 * 1000
const intelligenceMarkdown = new MarkdownIt({ html: false, linkify: true, breaks: true })
intelligenceMarkdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  tokens[index].attrSet('target', '_blank')
  tokens[index].attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, index, options)
}

const { openCapture } = useCaptureSheet()
const router = useRouter()
useSeoMeta({ title: 'Today | PlanCraft AI', description: 'Your day in PlanCraft AI.', canonicalPath: '/today', noindex: true })

const authStore = useAuthStore()
const focus = useFocusStore()
const featureFlagsStore = useFeatureFlagsStore()
const workspaceStore = useWorkspaceStore()
const quickSetupStore = useQuickSetupStore()
const { isPremium, refresh: refreshPremium } = useIsPremium()
const { now } = useDayClock()
const { allTasks, loadTasksForDate, toggleComplete, addTask, deleteTask, moveTasks, mergeTasksLocally, getTaskPlannedDate } = useTasks()

const loading = ref(true)
const activeTaskId = ref(null)
const editing = ref(false)
const saving = ref(false)
const draft = reactive({ title: '', details: '', date: '', time: '' })
const helping = ref(false)
const helpActionKey = ref('')
const helpSteps = ref([])
const helpError = ref('')
const helpIsFallback = ref(false)
const helpApplied = ref(false)
const applyingSteps = ref(false)
const planning = ref(false)
const planLines = ref([])
const planError = ref('')
const showCompleted = ref(false)
const undoState = ref(null)
const undoing = ref(false)
const taskResearchLoading = ref(false)
const taskResearchMemoryLoading = ref(false)
const taskResearchError = ref('')
const taskResearchQuestion = ref('')
const taskResearchResult = ref(null)
const taskResearchHistory = ref([])
const taskResearchAgents = ref([...INTELLIGENCE_AGENTS])
const taskResearchAgentId = ref(preferredTaskResearchAgentId())
const workspaceAiCache = new Map()
const workspaceAiInflight = new Map()
const taskResearchCache = new Map()
let taskResearchAgentsLoaded = false
let undoTimer = null

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
const todayTasks = computed(() => allTasks.value.filter((task) =>
  getTaskPlannedDate(task) === todayKey.value && !task.archived && !task.parentTaskId,
))
const byTime = (a, b) => String(a.reminderTime || '99:99').localeCompare(String(b.reminderTime || '99:99'))
const openTasks = computed(() => todayTasks.value.filter((task) => !task.completed).sort(byTime))
const doneTasks = computed(() => todayTasks.value.filter((task) => task.completed).sort(byTime))
// No saved state yet means a new user who hasn't set up (same rule the dashboard used).
const showSetupNudge = computed(
  () => authStore.guest !== true && authStore.user?.mode !== 'guest' && quickSetupStore.setupState?.completed !== true,
)
const intelligenceEnabled = computed(() => featureFlagsStore.isEnabled('INTELLIGENCE_DESK'))
const activeTask = computed(() => allTasks.value.find((task) => task.id === activeTaskId.value) || null)
const nextTaskAction = computed(() => nextActionForTask(activeTask.value))
const activeTaskChildren = computed(() => {
  if (!activeTask.value) return []
  return allTasks.value
    .filter((task) => task.parentTaskId === activeTask.value.id && !task.archived)
    .sort(byTime)
})
const taskActionSuggestions = computed(() => suggestionsForTask(activeTask.value))
const taskResearchAgent = computed(() => taskResearchAgents.value.find((agent) => agent.id === taskResearchAgentId.value) || null)
const assistantLine = computed(() => {
  const left = openTasks.value.length
  if (!left) return 'Everything for today is done. Nice work.'
  return `You have ${left} ${left === 1 ? 'task' : 'tasks'} left today.`
})

const taskMenu = [
  { key: 'edit', label: 'Edit', icon: Pencil },
  { key: 'reschedule', label: 'Reschedule', icon: CalendarArrowUp },
  { key: 'tomorrow', label: 'Move to tomorrow', icon: CalendarArrowUp },
  { key: 'duplicate', label: 'Duplicate', icon: Copy },
  { key: 'archive', label: 'Archive', icon: Archive },
  { key: 'delete', label: 'Delete', icon: Trash2, danger: true, dividerBefore: true },
]

function formatTime(task) {
  const timezone = getEffectiveUserTimezone()
  const scheduledValue = task?.scheduledTime
  const scheduled = scheduledValue?.toDate
    ? scheduledValue.toDate()
    : scheduledValue
      ? new Date(scheduledValue)
      : null
  if (scheduled && !Number.isNaN(scheduled.getTime())) {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(scheduled)
  }

  // reminderTime is a local wall-clock value (HH:mm), not a UTC timestamp.
  // Preserve those clock fields instead of constructing a Date in the device
  // timezone and then converting them a second time.
  const raw = String(task?.reminderTime || '')
  const match = /^(\d{1,2}):(\d{2})/.exec(raw)
  if (match) {
    const wallClock = new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2]), 0, 0))
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(wallClock)
  }

  return ''
}

function rowMetaFor(task) {
  return formatTime(task)
}

function sheetSubtitle(task) {
  const time = formatTime(task)
  return time ? `Today · ${time}` : 'Today'
}

function preferredTaskResearchAgentId() {
  return 'general-task-helper'
}

async function askWorkspaceSummaryEfficient({ workspaceId, question, cacheKey, ttlMs = WORKSPACE_AI_CACHE_TTL_MS }) {
  const key = cacheKey || JSON.stringify({ workspaceId: workspaceId || '', question: question || '' })
  const cached = workspaceAiCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, cached: true }
  }
  if (cached) workspaceAiCache.delete(key)

  const existing = workspaceAiInflight.get(key)
  if (existing) return { ...(await existing), cached: true }

  const request = askWorkspaceSummary({ workspaceId, question }).then((value) => {
    if (workspaceAiCache.size >= 50 && !workspaceAiCache.has(key)) {
      const oldestKey = workspaceAiCache.keys().next().value
      if (oldestKey) workspaceAiCache.delete(oldestKey)
    }
    workspaceAiCache.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  })
  workspaceAiInflight.set(key, request)
  try {
    return { ...(await request), cached: false }
  } finally {
    if (workspaceAiInflight.get(key) === request) workspaceAiInflight.delete(key)
  }
}

function openTask(task) {
  activeTaskId.value = task.id
  editing.value = false
  helpActionKey.value = ''
  helpSteps.value = []
  helpError.value = ''
  helpIsFallback.value = false
  helpApplied.value = false
  taskResearchQuestion.value = ''
  taskResearchResult.value = null
  taskResearchHistory.value = []
  taskResearchError.value = ''
  taskResearchMemoryLoading.value = false
  void loadTaskResearchMemory(task)
  trackEvent(EVENTS.TASK_OPENED, {
    surface: 'today',
    completed: !!task.completed,
    task_intent: taskIntent(task),
    has_reminder: !!formatTime(task),
  })
}

function renderIntelligenceMarkdown(value) {
  return intelligenceMarkdown.render(String(value || ''))
}

function sourceDomain(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return 'Source'
  }
}

function formatResearchTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

function openPremium() {
  router.push({ path: '/subscription', query: { source: 'task_intelligence' } }).catch(() => {})
}

async function loadTaskResearchAgents() {
  if (taskResearchAgentsLoaded) return
  try {
    const result = await fetchIntelligenceAgents()
    const customAgents = result.agents.filter((agent) => agent.custom)
    taskResearchAgents.value = [...INTELLIGENCE_AGENTS, ...customAgents]
    taskResearchAgentsLoaded = true
  } catch (error) {
    // Built-in agents remain available if the custom-agent list is unavailable.
    console.warn('[Today] intelligence agents unavailable', error?.message || error)
  }
}

async function loadTaskResearchMemory(task) {
  if (!task || !intelligenceEnabled.value || !isPremium.value) return

  taskResearchMemoryLoading.value = true
  try {
    const title = String(task.title || 'this task').trim().slice(0, 180)
    const notes = String(task.details || task.notes || '').trim().slice(0, 180)
    const result = await fetchTaskResearchMemory(task.id, { title, notes })
    if (activeTaskId.value !== task.id || !result?.memory) return

    const memory = result.memory
    await loadTaskResearchAgents()
    if (activeTaskId.value !== task.id) return
    if (memory.agentId) taskResearchAgentId.value = memory.agentId
    taskResearchQuestion.value = memory.userQuestion || ''
    taskResearchResult.value = { ...memory, cached: true, persisted: true }
    taskResearchHistory.value = Array.isArray(result.history) ? result.history : [memory]
  } catch (error) {
    // Saved memory is an optimization. A read failure must not block the task sheet.
    console.warn('[Today] task research memory unavailable', error?.message || error)
  } finally {
    if (activeTaskId.value === task.id) taskResearchMemoryLoading.value = false
  }
}

function showTaskResearchVersion(version) {
  if (!version) return
  taskResearchResult.value = { ...version, cached: true, persisted: true }
  if (version.agentId) taskResearchAgentId.value = version.agentId
  taskResearchQuestion.value = version.userQuestion || ''
}

async function runTaskResearch() {
  const task = activeTask.value
  if (!task || taskResearchLoading.value) return

  taskResearchLoading.value = true
  await refreshPremium({ minIntervalMs: 15000 })
  if (!featureFlagsStore.isEnabled('INTELLIGENCE_DESK')) {
    taskResearchError.value = 'Live task research is not enabled right now.'
    taskResearchLoading.value = false
    return
  }
  if (!isPremium.value) {
    openPremium()
    taskResearchLoading.value = false
    return
  }

  await loadTaskResearchAgents()
  const agent = taskResearchAgent.value || taskResearchAgents.value[0]
  if (!agent) {
    taskResearchError.value = 'No intelligence agent is available right now.'
    taskResearchLoading.value = false
    return
  }

  taskResearchError.value = ''
  const title = String(task.title || 'this task').trim().slice(0, 180)
  const notes = String(task.details || task.notes || '').trim().slice(0, 180)
  const userQuestion = taskResearchQuestion.value.trim().slice(0, 220)
  const question = [
    userQuestion || 'What current public information could help me make progress on this task?',
    `Task: ${title}`,
    `Notes: ${notes || 'none'}`,
    'Use current public sources, include dates and links, distinguish facts from inference, and say when the evidence is uncertain.',
  ].join('\n').slice(0, 500)
  const interests = `${title}${notes ? `; ${notes}` : ''}`.slice(0, 300)
  const isCustom = Boolean(agent.custom)
  // If an answer is already visible, the user explicitly asked to refresh it.
  // Do not silently serve the in-memory cache in that case.
  const forceRefresh = Boolean(taskResearchResult.value)
  const researchCacheKey = JSON.stringify({
    uid: authStore.user?.uid || 'guest',
    agentId: agent.id,
    question,
    interests,
  })

  trackEvent(EVENTS.INTELLIGENCE_TASK_RESEARCH_STARTED, {
    surface: 'today_task_sheet',
    agent_id: agent.id,
    has_question: Boolean(userQuestion),
  })

  const cachedResearch = forceRefresh ? null : taskResearchCache.get(researchCacheKey)
  if (cachedResearch && cachedResearch.expiresAt > Date.now()) {
    taskResearchResult.value = { ...cachedResearch.value, cached: true }
    trackEvent(EVENTS.INTELLIGENCE_TASK_RESEARCH_COMPLETED, {
      surface: 'today_task_sheet',
      agent_id: agent.id,
      source_count: Array.isArray(taskResearchResult.value?.sources) ? taskResearchResult.value.sources.length : 0,
      cached: true,
      status: 'success',
    })
    taskResearchLoading.value = false
    return
  }
  if (cachedResearch) taskResearchCache.delete(researchCacheKey)

  try {
    const result = await fetchIntelligenceBrief({
      agentIds: isCustom ? [] : [agent.id],
      customAgentIds: isCustom ? [agent.id] : [],
      question,
      interests,
      surface: 'task',
      // Task research is explicitly user-initiated and does not inherit a goal.
      goalContext: null,
    })
    const freshResult = { ...result, agentId: agent.id, agentLabel: agent.label || agent.name, persisted: false }
    taskResearchResult.value = freshResult

    try {
      const saved = await saveTaskResearchMemory(task.id, {
        agentId: agent.id,
        agentLabel: agent.label || agent.name,
        userQuestion,
        question,
        interests,
        titleSnapshot: title,
        notesSnapshot: notes,
        generatedAt: result.generatedAt,
        synthesis: result.synthesis,
        sources: result.sources,
        agents: result.agents,
        suggestedTasks: result.suggestedTasks,
      })
      if (activeTaskId.value === task.id && saved?.memory) {
        taskResearchResult.value = { ...taskResearchResult.value, ...saved.memory, persisted: true, cached: Boolean(result.cached) }
        taskResearchHistory.value = [saved.memory, ...taskResearchHistory.value.filter((version) => version.id !== saved.memory.id)].slice(0, 10)
      }
    } catch (error) {
      // Keep the answer visible even if persistence is temporarily unavailable.
      console.warn('[Today] task research memory save failed', error?.message || error)
    }

    taskResearchCache.set(researchCacheKey, {
      value: taskResearchResult.value,
      expiresAt: Date.now() + TASK_RESEARCH_CACHE_TTL_MS,
    })
    if (taskResearchCache.size > 20) {
      const oldestKey = taskResearchCache.keys().next().value
      if (oldestKey && oldestKey !== researchCacheKey) taskResearchCache.delete(oldestKey)
    }
    trackEvent(EVENTS.INTELLIGENCE_TASK_RESEARCH_COMPLETED, {
      surface: 'today_task_sheet',
      agent_id: agent.id,
      source_count: Array.isArray(taskResearchResult.value?.sources) ? taskResearchResult.value.sources.length : 0,
      cached: Boolean(taskResearchResult.value?.cached),
      status: 'success',
    })
  } catch (error) {
    const status = Number(error?.response?.status || 0)
    const code = String(error?.response?.data?.code || '').toLowerCase()
    if (status === 403 || code === 'intelligence_premium_required') {
      openPremium()
      taskResearchError.value = 'Live task research is part of Premium Intelligence.'
    } else if (status === 404) {
      taskResearchError.value = 'Intelligence is not enabled for this account yet.'
    } else {
      taskResearchError.value = error?.response?.data?.error || error?.message || 'Live research is unavailable right now. Try again in a moment.'
    }
    trackEvent(EVENTS.INTELLIGENCE_TASK_RESEARCH_COMPLETED, {
      surface: 'today_task_sheet',
      agent_id: agent.id,
      source_count: 0,
      cached: false,
      status: 'error',
    })
  } finally {
    taskResearchLoading.value = false
  }
}

function trackTaskOverflow(task) {
  trackEvent(EVENTS.TASK_OVERFLOW_OPENED, {
    surface: 'today',
    completed: !!task.completed,
    task_intent: taskIntent(task),
  })
}

function closeTask() {
  activeTaskId.value = null
  editing.value = false
  helpActionKey.value = ''
}

async function complete(task, fromSheet = false) {
  const wasCompleted = !!task.completed
  const changed = await toggleComplete(task)
  if (!changed) {
    ElMessage.error('Could not update the task. Please try again.')
    return
  }
  if (!wasCompleted && task.completed) showCompletionUndo(task)
  if (fromSheet && task.completed) closeTask()
}

function showCompletionUndo(task) {
  if (undoTimer) clearTimeout(undoTimer)
  undoState.value = { taskId: task.id }
  undoTimer = setTimeout(() => {
    undoState.value = null
    undoTimer = null
  }, 5000)
}

async function undoCompletion() {
  const taskId = undoState.value?.taskId
  const task = allTasks.value.find((entry) => entry.id === taskId)
  if (!task || undoing.value) return
  undoing.value = true
  const changed = await toggleComplete(task)
  undoing.value = false
  if (changed && !task.completed) {
    if (undoTimer) clearTimeout(undoTimer)
    undoState.value = null
    undoTimer = null
  } else if (!changed) {
    ElMessage.error('Could not undo completion. Please try again.')
  }
}

function startFocus(task) {
  if (focus.isOpen) {
    ElMessage.info('Finish your current focus session first.')
    return
  }
  focus.open(task, authStore.user?.uid)
  closeTask()
}

function taskIntent(task) {
  const text = `${task?.title || ''} ${task?.details || ''}`.toLowerCase()
  if (/\b(call|email|text|message|contact|dentist|doctor|appointment)\b/.test(text)) return 'communication'
  if (/\b(interview|exam|study|prepare|project|build|launch|write|research|plan|review)\b/.test(text)) return 'planning'
  if (/\b(buy|shop|pick up|drop off|grocery|errand|return)\b/.test(text)) return 'errand'
  if (/\b(gym|workout|run|walk|sleep|meditat|health)\b/.test(text)) return 'wellbeing'
  return 'general'
}

function taskLocation(task) {
  const text = `${task?.title || ''} ${task?.details || ''}`.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const match = text.match(/\b(?:go|drive|travel|head|navigate|visit)\s+(?:to\s+)?(.+?)(?=\s+(?:today|tomorrow|on|at|by|for)\b|$)/i)
  return String(match?.[1] || '').replace(/[.,;:!?]+$/, '').trim()
}

function nextActionForTask(task) {
  if (!task || task.completed) return null
  const text = `${task.title || ''} ${task.details || ''}`.toLowerCase()
  const location = taskLocation(task)
  if (location) {
    return {
      type: 'open_map',
      title: 'Get the route',
      description: `Open directions to ${location}.`,
      cta: 'Open Maps',
      icon: markRaw(MapPin),
      location,
    }
  }
  if (!formatTime(task) && /\b(call|email|text|message|appointment|doctor|dentist|interview|deadline|submit|renew)\b/.test(text)) {
    return {
      type: 'set_reminder',
      title: 'Put it on the clock',
      description: 'Choose a time so this important task does not stay in your head.',
      cta: 'Set reminder',
      icon: markRaw(BellRing),
    }
  }
  if (/\b(research|prepare|compare|find|learn|investigate|check|latest|news|company|market)\b/.test(text)) {
    return {
      type: 'research',
      title: 'Clear the unknowns',
      description: 'Ask an intelligence agent for current, source-backed context.',
      cta: 'Ask Intelligence',
      icon: markRaw(Sparkles),
    }
  }
  return {
    type: 'focus',
    title: 'Start a focused first pass',
    description: 'Give this task 25 uninterrupted minutes and make visible progress.',
    cta: 'Start focus',
    icon: markRaw(Play),
  }
}

function runNextTaskAction() {
  const task = activeTask.value
  const action = nextTaskAction.value
  if (!task || !action) return
  trackEvent(EVENTS.TASK_CAPABILITY_OPENED, {
    surface: 'today_task_sheet',
    capability: action.type,
    task_intent: taskIntent(task),
  })
  if (action.type === 'open_map') {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(action.location)}`
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    if (!opened) window.location.assign(url)
  } else if (action.type === 'set_reminder') {
    beginEditing(task, 'reschedule')
  } else if (action.type === 'research') {
    runTaskResearch()
  } else if (action.type === 'focus') {
    startFocus(task)
  }
}

function suggestionsForTask(task) {
  if (!task || task.completed) return []
  const intent = taskIntent(task)
  const hasReminder = !!formatTime(task)
  const ai = (key, label, description, icon = Sparkles) => ({ key, label, description, icon: markRaw(icon) })
  const reminder = { key: 'set_reminder', label: 'Set reminder', description: 'Choose when PlanCraft should nudge you.', icon: markRaw(BellRing) }

  if (intent === 'communication') {
    return [
      ai('help_prepare', 'Help me prepare', 'Suggest one practical next step.'),
      ...(hasReminder ? [] : [reminder]),
    ]
  }

  if (intent === 'planning') {
    return [
      ai('get_started', 'Get me started', 'Give me a clear first move.'),
      ai('break_steps', 'Break into steps', 'Turn this into a short checklist.', ListChecks),
      ai('make_plan', 'Make a plan', 'Shape the work around your time.'),
    ]
  }

  return [
    ai('get_started', 'Get me started', 'Give me a clear first move.'),
    ...(hasReminder ? [] : [reminder]),
  ]
}

function fallbackStepsForTask(task, actionKey) {
  const title = String(task?.title || 'this task').trim()
  if (actionKey === 'help_prepare') {
    return [
      `Define what a successful result looks like for “${title}”.`,
      'Choose the smallest action you can complete in the next 15 minutes.',
    ]
  }
  if (actionKey === 'make_plan') {
    return [
      `Clarify the outcome and key requirements for “${title}”.`,
      'Prioritize the most important piece of work first.',
      'Block focused time to complete a first working pass.',
      'Review the result and capture any follow-up work.',
    ]
  }
  return [
    `Clarify the outcome and requirements for “${title}”.`,
    'Break the work into the smallest concrete actions.',
    'Complete the highest-priority action first.',
    'Review the result and note any remaining gaps.',
  ]
}

function beginEditing(task, mode = 'edit') {
  if (!task) return
  if (activeTaskId.value !== task.id) openTask(task)
  draft.title = task.title || ''
  draft.details = task.details || ''
  draft.date = getTaskPlannedDate(task) || todayKey.value
  draft.time = /^\d{1,2}:\d{2}/.test(String(task.reminderTime || '')) ? String(task.reminderTime).slice(0, 5) : ''
  editing.value = true
  if (mode === 'reschedule') helpError.value = ''
}

function selectTaskAction(actionKey) {
  const task = activeTask.value
  if (!task) return
  if (actionKey === 'set_reminder') {
    beginEditing(task, 'reschedule')
    return
  }
  runAiAction(task, actionKey)
}

async function runAiAction(task, actionKey) {
  const workspaceId = workspaceStore.activeWorkspaceId
  helping.value = true
  helpActionKey.value = actionKey
  helpError.value = ''
  helpSteps.value = []
  helpIsFallback.value = false
  helpApplied.value = false
  const intent = taskIntent(task)
  trackEvent(EVENTS.AI_HELP_SELECTED, {
    surface: 'today_task_sheet',
    action: actionKey,
    task_intent: intent,
  })

  const question = (() => {
    if (actionKey === 'help_prepare') {
      return `Suggest exactly one practical next step for this task. Reply with one short actionable line and nothing else.\nTask: ${task.title}\nNotes: ${task.details || 'none'}`
    }
    if (actionKey === 'make_plan') {
      return `Create a short actionable plan for this task in 3 to 5 steps. Reply with one step per line and nothing else. Do not add filler.\nTask: ${task.title}\nNotes: ${task.details || 'none'}`
    }
    if (actionKey === 'break_steps') {
      return `Break this task into 3 to 5 short, concrete steps. Reply with one step per line and nothing else. Do not add filler.\nTask: ${task.title}\nNotes: ${task.details || 'none'}`
    }
    return `Give me exactly 3 short lines: first, the immediate action; then 2 supporting steps. Reply with one step per line and nothing else.\nTask: ${task.title}\nNotes: ${task.details || 'none'}`
  })()

  try {
    const cacheKey = JSON.stringify({
      type: 'task-help',
      uid: authStore.user?.uid || 'guest',
      workspaceId: workspaceId || '',
      actionKey,
      title: task.title || '',
      details: task.details || '',
    })
    const { answer, cached } = await askWorkspaceSummaryEfficient({
      workspaceId,
      question,
      cacheKey,
    })
    helpSteps.value = toLines(answer).slice(0, 5)
    if (!helpSteps.value.length) {
      helpSteps.value = fallbackStepsForTask(task, actionKey)
      helpIsFallback.value = true
    }
    trackEvent(EVENTS.AI_HELP_COMPLETED, {
      surface: 'today_task_sheet',
      action: actionKey,
      task_intent: intent,
      result_count: helpSteps.value.length,
      status: helpIsFallback.value ? 'fallback' : 'success',
      cached: Boolean(cached),
    })
  } catch {
    // Task help is optional. Keep the task useful even when the network or
    // model is slow by falling back to deterministic, local starter steps.
    helpSteps.value = fallbackStepsForTask(task, actionKey)
    helpIsFallback.value = true
    helpError.value = ''
    trackEvent(EVENTS.AI_HELP_COMPLETED, {
      surface: 'today_task_sheet',
      action: actionKey,
      task_intent: intent,
      result_count: helpSteps.value.length,
      status: 'fallback',
    })
  } finally {
    helping.value = false
  }
}

function retryHelp() {
  if (activeTask.value && helpActionKey.value) runAiAction(activeTask.value, helpActionKey.value)
}

async function applyHelpSteps(task) {
  if (!task || !helpSteps.value.length || helpApplied.value) return
  applyingSteps.value = true
  let applied = 0
  const existing = new Set(activeTaskChildren.value.map((child) => String(child.title || '').toLowerCase()))
  try {
    for (const step of helpSteps.value) {
      const title = String(step || '').trim()
      if (!title || existing.has(title.toLowerCase())) continue
      await addTask({
        title,
        details: '',
        category: task.category,
        date: getTaskPlannedDate(task) || todayKey.value,
        source: 'ai_steps_applied',
        parentTaskId: task.id,
        parentTaskTitle: task.title,
      })
      existing.add(title.toLowerCase())
      applied += 1
    }
    helpApplied.value = true
    trackEvent(EVENTS.AI_STEPS_APPLIED, {
      surface: 'today_task_sheet',
      task_intent: taskIntent(task),
      step_count: applied,
      source_action: helpActionKey.value,
    })
    ElMessage.success(applied ? `Added ${applied} subtask${applied === 1 ? '' : 's'}` : 'Those subtasks already exist')
  } catch {
    helpError.value = 'I couldn’t add all of those subtasks. Please try again.'
  } finally {
    applyingSteps.value = false
  }
}

async function planRestOfDay() {
  planning.value = true
  planError.value = ''
  const currentTasks = openTasks.value.map((task) => ({
    id: task.id,
    title: task.title || '',
    reminderTime: task.reminderTime || '',
  }))
  const question = `It is ${new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: getEffectiveUserTimezone(),
  }).format(now.value)}. Plan the rest of my day from my open tasks: suggest an order with rough times. Reply with one short line per step.`
  try {
    const { answer } = await askWorkspaceSummaryEfficient({
      workspaceId: workspaceStore.activeWorkspaceId,
      question,
      cacheKey: JSON.stringify({
        type: 'plan-day',
        uid: authStore.user?.uid || 'guest',
        workspaceId: workspaceStore.activeWorkspaceId || '',
        tasks: currentTasks,
      }),
      ttlMs: 10 * 60 * 1000,
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

function onSheetMenu(key) {
  if (activeTask.value) trackTaskOverflow(activeTask.value)
  onMenu(key, activeTask.value)
}

async function onMenu(key, taskOverride = null) {
  const task = taskOverride || activeTask.value
  if (!task) return
  if (key === 'edit') {
    beginEditing(task)
  } else if (key === 'reschedule') {
    beginEditing(task, 'reschedule')
  } else if (key === 'tomorrow') {
    const tomorrow = new Date(now.value)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const targetDate = toLocalDateKey(tomorrow)
    try {
      await moveTasks([task], targetDate)
      if (task.reminderTime || task.scheduledTime) {
        await updateTaskInFirebase({ ...task, date: targetDate, scheduledTime: null })
      }
      closeTask()
      ElMessage.success('Moved to tomorrow')
    } catch {
      ElMessage.error('Could not move the task. Please try again.')
    }
  } else if (key === 'duplicate') {
    try {
      await addTask({ title: task.title, details: task.details || '', category: task.category, date: todayKey.value, source: 'today_duplicate' })
      ElMessage.success('Duplicated')
    } catch {
      ElMessage.error('Could not duplicate the task. Please try again.')
    }
  } else if (key === 'archive') {
    try {
      const updated = { ...task, archived: true }
      await updateTaskInFirebase(updated)
      mergeTasksLocally([updated])
      closeTask()
      ElMessage.success('Archived')
    } catch {
      ElMessage.error('Could not archive the task. Please try again.')
    }
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
    try {
      await deleteTask(task)
      closeTask()
      ElMessage.success('Deleted')
    } catch {
      ElMessage.error('Could not delete the task. Please try again.')
    }
  }
}

async function saveEdit() {
  const task = activeTask.value
  if (!task || !draft.title.trim()) return
  const nextDate = draft.date || getTaskPlannedDate(task) || todayKey.value
  const nextTime = draft.time || null
  const timeChanged = nextTime !== (String(task.reminderTime || '').slice(0, 5) || null)
  const dateChanged = nextDate !== (getTaskPlannedDate(task) || todayKey.value)
  saving.value = true
  try {
    const updated = {
      ...task,
      title: draft.title.trim(),
      details: draft.details,
      date: nextDate,
      reminderTime: nextTime,
      // A stored scheduledTime wins over date + reminderTime, so drop it when either changes.
      ...(timeChanged || dateChanged ? { scheduledTime: null } : {}),
    }
    await updateTaskInFirebase(updated)
    mergeTasksLocally([updated])
    editing.value = false
  } catch {
    ElMessage.error('Could not save changes. Please try again.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  featureFlagsStore.ensureLoaded().catch(() => {})
  try {
    await loadTasksForDate(todayKey.value)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (undoTimer) clearTimeout(undoTimer)
})
</script>

<style scoped>
.today {
  box-sizing: border-box;
  min-height: 100%;
  width: 100%;
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
  position: relative;
  display: grid;
  gap: var(--pc-space-1);
  margin: 0 calc(-1 * var(--pc-space-2));
}

.today-task-enter-active,
.today-task-leave-active {
  transition: opacity var(--pc-duration) var(--pc-ease), transform var(--pc-duration) var(--pc-ease);
}

.today-task-enter-from,
.today-task-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

.today-task-leave-active {
  position: absolute;
  width: 100%;
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

.today__done-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text-subtle);
  font: inherit;
  font-size: var(--pc-text-small);
  font-weight: 600;
  cursor: pointer;
}

.today__done-toggle:hover {
  color: var(--pc-text);
}

.today__done-toggle:focus-visible {
  outline: 2px solid var(--pc-focus-ring);
  outline-offset: 3px;
  border-radius: var(--pc-radius-sm);
}

.today__done-chevron--open {
  transform: rotate(180deg);
}

.today__done-list {
  display: grid;
  gap: var(--pc-space-1);
  margin-top: var(--pc-space-2);
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

.today__row-menu {
  display: inline-flex;
}

.today__suggestions {
  display: grid;
  gap: var(--pc-space-2);
}

.today__suggestion {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--pc-space-3);
  width: 100%;
  padding: var(--pc-space-3);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--pc-duration-fast) var(--pc-ease), background-color var(--pc-duration-fast) var(--pc-ease);
}

.today__suggestion:hover,
.today__suggestion:focus-visible {
  border-color: var(--pc-accent);
  background: var(--pc-accent-soft);
  outline: none;
}

.today__suggestion:disabled {
  cursor: wait;
  opacity: 0.6;
}

.today__suggestion-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.today__suggestion-copy strong {
  font-size: var(--pc-text-body);
  font-weight: 600;
}

.today__suggestion-copy small {
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.today__suggestion-arrow {
  color: var(--pc-accent-text);
  font-size: 1.25rem;
}

.today__focus-action {
  padding-top: var(--pc-space-1);
}

.today__next-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-3);
  padding: var(--pc-space-3);
  border: 1px solid var(--pc-accent-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-accent-soft);
}

.today__next-action-copy {
  min-width: 0;
}

.today__next-action-copy h3 {
  margin: 0.2rem 0 0;
  font-size: var(--pc-text-body);
  font-weight: 700;
}

.today__next-action-copy > p:last-child {
  margin: 0.25rem 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  line-height: 1.4;
}

.today__next-action-button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--pc-accent);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-accent-text);
  font: inherit;
  font-size: var(--pc-text-small);
  font-weight: 700;
  cursor: pointer;
}

.today__next-action-button:hover,
.today__next-action-button:focus-visible {
  background: var(--pc-surface-2);
  outline: none;
}

.today__research {
  display: grid;
  gap: var(--pc-space-3);
  padding: var(--pc-space-4);
  border: 1px solid var(--pc-accent-border);
  border-radius: var(--pc-radius-lg);
  background: linear-gradient(135deg, var(--pc-accent-soft), var(--pc-surface));
}

.today__research-head,
.today__research-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pc-space-3);
}

.today__research-head h3 {
  margin: var(--pc-space-1) 0 0;
  font-size: var(--pc-text-body);
  font-weight: 700;
}

.today__research-head p:not(.today__research-eyebrow) {
  max-width: 34rem;
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  line-height: 1.45;
}

.today__research-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-1);
  margin: 0;
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.today__premium-badge {
  flex-shrink: 0;
  padding: 0.2rem 0.5rem;
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: var(--pc-radius-full);
  background: rgba(255, 251, 235, 0.9);
  color: #a16207;
  font-size: var(--pc-text-caption);
  font-weight: 700;
}

.today__research-controls {
  display: grid;
  grid-template-columns: minmax(9rem, 0.7fr) minmax(0, 1.3fr);
  gap: var(--pc-space-2);
}

.today__research-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
  font-weight: 600;
}

.today__research-select,
.today__research-input {
  width: 100%;
  min-width: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--pc-border-strong);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-text);
  font: inherit;
  font-size: var(--pc-text-small);
  font-weight: 400;
}

.today__research-select:focus,
.today__research-input:focus {
  outline: none;
  border-color: var(--pc-accent);
  box-shadow: 0 0 0 3px var(--pc-accent-soft);
}

.today__research-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--pc-space-2);
  justify-self: start;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--pc-accent);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-accent-text);
  font: inherit;
  font-size: var(--pc-text-small);
  font-weight: 700;
  cursor: pointer;
}

.today__research-button:hover,
.today__research-button:focus-visible {
  background: var(--pc-accent-soft);
  outline: none;
}

.today__research-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.today__research-spin {
  animation: today-research-spin 1s linear infinite;
}

@keyframes today-research-spin {
  to {
    transform: rotate(360deg);
  }
}

.today__research-locked {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-2);
  padding-top: var(--pc-space-1);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
}

.today__research-locked p {
  margin: 0;
}

.today__research-locked button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-accent-text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.today__research-error {
  padding: var(--pc-space-2) var(--pc-space-3);
  border-radius: var(--pc-radius-md);
  background: color-mix(in srgb, var(--pc-danger) 8%, transparent);
  color: var(--pc-danger);
  font-size: var(--pc-text-small);
}

.today__research-result {
  display: grid;
  gap: var(--pc-space-3);
  padding-top: var(--pc-space-3);
  border-top: 1px solid var(--pc-accent-border);
}

.today__research-result-meta,
.today__research-result-head time {
  margin: 0.2rem 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
}

.today__research-result-head time {
  flex-shrink: 0;
}

.today__research-answer {
  color: var(--pc-text);
  font-size: var(--pc-text-small);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.today__research-answer :deep(p) {
  margin: 0 0 var(--pc-space-2);
}

.today__research-answer :deep(p:last-child) {
  margin-bottom: 0;
}

.today__research-answer :deep(h1),
.today__research-answer :deep(h2),
.today__research-answer :deep(h3) {
  margin: var(--pc-space-3) 0 var(--pc-space-1);
  font-size: var(--pc-text-body);
  font-weight: 700;
}

.today__research-answer :deep(ul),
.today__research-answer :deep(ol) {
  display: grid;
  gap: 0.35rem;
  margin: 0 0 var(--pc-space-2);
  padding-left: 1.25rem;
}

.today__research-answer :deep(a) {
  color: var(--pc-accent-text);
  text-decoration: underline;
}

.today__research-sources {
  padding-top: var(--pc-space-2);
  border-top: 1px solid var(--pc-border);
}

.today__research-sources summary {
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 700;
  cursor: pointer;
}

.today__research-sources a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-2);
  margin-top: var(--pc-space-2);
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  text-decoration: none;
}

.today__research-sources a span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today__research-history {
  padding-top: var(--pc-space-2);
  border-top: 1px solid var(--pc-border);
}

.today__research-history summary {
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 700;
  cursor: pointer;
}

.today__research-history button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--pc-space-2);
  margin-top: var(--pc-space-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-accent-text);
  font: inherit;
  font-size: var(--pc-text-caption);
  text-align: left;
  cursor: pointer;
}

.today__research-history button time {
  color: var(--pc-text-muted);
  white-space: nowrap;
}

.today__help-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pc-space-2);
  margin-top: var(--pc-space-3);
}

.today__help-footer small {
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
}

.today__subtasks {
  display: grid;
  gap: var(--pc-space-1);
  padding-top: var(--pc-space-4);
  border-top: 1px solid var(--pc-border);
}

.today__subtasks-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  font-weight: 600;
}

.today__subtasks-heading small {
  font-weight: 500;
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

.today__undo {
  position: fixed;
  left: 50%;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  z-index: var(--pc-z-menu);
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-3);
  transform: translateX(-50%);
  padding: var(--pc-space-2) var(--pc-space-2) var(--pc-space-2) var(--pc-space-3);
  border: 1px solid var(--pc-border-strong);
  border-radius: var(--pc-radius-full);
  background: var(--pc-surface);
  color: var(--pc-text);
  box-shadow: var(--pc-shadow-overlay);
  white-space: nowrap;
}

.today__undo button {
  padding: var(--pc-space-1) var(--pc-space-2);
  border: 0;
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font: inherit;
  font-size: var(--pc-text-small);
  font-weight: 700;
  cursor: pointer;
}

.today__undo button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.today-undo-enter-active,
.today-undo-leave-active {
  transition: opacity var(--pc-duration-fast) var(--pc-ease), transform var(--pc-duration-fast) var(--pc-ease);
}

.today-undo-enter-from,
.today-undo-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.5rem);
}

@media (max-width: 767px) {
  .today__next-action {
    align-items: stretch;
    flex-direction: column;
  }

  .today__next-action-button {
    justify-content: center;
  }

  .today__research-controls {
    grid-template-columns: 1fr;
  }

  .today__research-button {
    width: 100%;
  }

  .today__undo {
    bottom: calc(5.75rem + env(safe-area-inset-bottom));
    max-width: calc(100vw - 2rem);
  }
}
</style>
