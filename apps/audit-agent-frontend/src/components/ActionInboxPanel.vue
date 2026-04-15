<template>
  <section class="rounded-2xl bg-white/6 border border-white/10 p-5 shadow-lg space-y-4 animate-slide-up">
    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">{{ eyebrow }}</p>
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <p class="text-sm text-slate-300">
          {{ description }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-100">
          {{ pendingSuggestionsLabel }}
        </span>
        <button
          class="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-slate-100 hover:border-indigo-300/60 transition disabled:opacity-60"
          :disabled="!hasWorkspace || actionInboxLoading"
          @click="() => refreshActionInbox({ sync: true, trigger: 'manual_refresh' })"
        >
          {{ actionInboxLoading ? 'Refreshing…' : 'Refresh inbox' }}
        </button>
      </div>
    </div>

    <div
      v-if="!hasWorkspace"
      class="rounded-xl border border-dashed border-white/15 bg-slate-900/35 px-4 py-6 text-sm text-indigo-100/75"
    >
      Select a workspace to route confirmed suggestions into tasks.
    </div>

    <div
      v-else-if="actionInboxDailyIntentLoading && !actionInboxDailyIntent"
      class="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-5 text-sm text-fuchsia-50"
    >
      Shaping today’s focus from your action inbox…
    </div>

    <section
      v-else-if="actionInboxDailyIntent?.focus"
      class="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/12 via-indigo-500/12 to-cyan-500/10 p-5 shadow-lg"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-3 min-w-0">
          <div>
            <p class="text-xs uppercase tracking-[0.28em] text-fuchsia-200/80">Today’s Focus</p>
            <h4 class="mt-2 text-2xl font-semibold text-white">
              {{ actionInboxDailyIntent.focus.displayTitle || actionInboxDailyIntent.focus.title }}
            </h4>
            <p class="mt-2 text-sm text-fuchsia-50/90">{{ actionInboxDailyIntent.summary }}</p>
            <p class="mt-1 text-sm text-indigo-100/85">{{ actionInboxDailyIntent.secondarySummary }}</p>
          </div>

          <div class="flex flex-wrap gap-2 text-xs">
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/90">
              {{ formatSuggestionTiming(actionInboxDailyIntent.focus) }}
            </span>
            <span class="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-100">
              {{ confidencePercent(actionInboxDailyIntent.focus) }}% confidence
            </span>
            <span class="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-cyan-100">
              {{ actionInboxDailyIntent.focus.category || 'Other' }}
            </span>
            <span
              v-if="actionInboxDailyIntent.pendingCount > 1"
              class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80"
            >
              {{ actionInboxDailyIntent.pendingCount }} pending suggestions
            </span>
          </div>

          <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p class="text-[11px] uppercase tracking-[0.2em] text-fuchsia-100/70">Why this matters today</p>
            <p class="mt-1 text-sm text-slate-100">
              {{
                actionInboxDailyIntent.focus.reason ||
                actionInboxDailyIntent.focus.rationale ||
                suggestionSummary(actionInboxDailyIntent.focus)
              }}
            </p>
          </div>
        </div>

        <div class="min-w-[220px] rounded-xl border border-white/10 bg-slate-950/35 px-4 py-4">
          <p class="text-[11px] uppercase tracking-[0.2em] text-indigo-200/80">Prompt</p>
          <p class="mt-2 text-sm font-medium text-white">{{ actionInboxDailyIntent.prompt }}</p>
          <div v-if="actionInboxDailyIntent.supporting?.length" class="mt-4 space-y-2">
            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Also waiting</p>
            <div
              v-for="support in actionInboxDailyIntent.supporting"
              :key="support.id"
              class="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <p class="text-sm text-slate-100">{{ support.displayTitle || support.title }}</p>
              <p class="mt-1 text-xs text-slate-400">{{ formatSuggestionTiming(support) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="hasWorkspace && actionInboxInsightsLoading && !actionInboxInsights"
      class="rounded-xl border border-white/10 bg-slate-900/35 px-4 py-5 text-sm text-slate-300"
    >
      Learning what tends to stick from your inbox…
    </div>

    <div v-if="hasWorkspace && actionInboxInsights" class="space-y-3">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="card in actionInboxInsightCards"
          :key="card.label"
          class="rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3"
        >
          <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">{{ card.label }}</p>
          <p class="mt-2 text-2xl font-semibold text-white">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-300">{{ card.hint }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-4">
        <p class="text-[11px] uppercase tracking-[0.22em] text-indigo-200/80">Learning loop</p>
        <p class="mt-2 text-sm text-indigo-50">{{ actionInboxInsights.behaviorSummary }}</p>
        <div class="mt-3 flex flex-wrap gap-2 text-xs text-indigo-100/85">
          <span
            v-if="actionInboxInsights.topConfirmedCategory"
            class="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1"
          >
            Most confirmed: {{ actionInboxInsights.topConfirmedCategory }}
          </span>
          <span
            v-if="actionInboxInsights.topIgnoredCategory"
            class="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1"
          >
            Most ignored: {{ actionInboxInsights.topIgnoredCategory }}
          </span>
          <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Window: last {{ actionInboxInsights.timeframeDays }} days
          </span>
        </div>
      </div>
    </div>

    <div
      v-if="actionInboxLoading && !actionSuggestions.length"
      class="rounded-xl border border-white/10 bg-slate-900/45 px-4 py-6 text-sm text-slate-300"
    >
      Loading your suggested actions…
    </div>

    <div
      v-else-if="!actionSuggestions.length"
      class="rounded-xl border border-dashed border-white/15 bg-slate-900/35 px-4 py-8 text-center text-sm text-indigo-100/75"
    >
      {{ emptyMessage }}
    </div>

    <div v-else class="grid gap-3 lg:grid-cols-2">
      <article
        v-for="item in actionSuggestions"
        :key="item.id"
        class="rounded-2xl border border-white/10 bg-slate-900/55 p-4 space-y-4 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-2 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] px-2 py-1 rounded-full border" :class="confidenceBadgeClass(item.confidence)">
                {{ confidenceLabel(item.confidence) }}
              </span>
              <span class="text-[11px] text-slate-400">
                {{ confidencePercent(item) }}% confidence
              </span>
              <span class="text-[11px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-slate-200">
                {{ item.category || 'Other' }}
              </span>
              <span
                v-if="item.urgency"
                class="text-[11px] px-2 py-1 rounded-full border border-amber-300/30 bg-amber-500/10 text-amber-100 capitalize"
              >
                {{ item.urgency }} urgency
              </span>
            </div>
            <div>
              <h4 class="text-base font-semibold text-white">{{ item.displayTitle || item.title }}</h4>
              <p class="text-sm text-slate-300">
                {{ suggestionSummary(item) }}
              </p>
            </div>
            <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Why this showed up</p>
              <p class="mt-1 text-sm text-slate-200">{{ item.reason || item.rationale || suggestionSummary(item) }}</p>
            </div>
          </div>
          <span class="text-[11px] text-indigo-200/80 shrink-0">
            Detected from your {{ item.sourceLabel || 'note' }}
          </span>
        </div>

        <div class="flex flex-wrap gap-2 text-xs">
          <span
            class="px-2.5 py-1 rounded-full border"
            :class="item.dueDate || item.scheduledTime ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-300'"
          >
            {{ formatSuggestionTiming(item) }}
          </span>
          <span
            v-for="reason in item.reasons || []"
            :key="`${item.id}-${reason}`"
            class="px-2.5 py-1 rounded-full border border-indigo-300/20 bg-indigo-500/10 text-indigo-100"
          >
            {{ formatReason(reason) }}
          </span>
          <span
            v-for="field in item.missingFields || []"
            :key="`${item.id}-missing-${field}`"
            class="px-2.5 py-1 rounded-full border border-amber-300/20 bg-amber-500/10 text-amber-100"
          >
            Needs {{ formatMissingField(field) }}
          </span>
          <span
            v-if="item.lastSurfacedReason"
            class="px-2.5 py-1 rounded-full border border-sky-300/20 bg-sky-500/10 text-sky-100"
          >
            Resurfaced: {{ formatSurfacedReason(item.lastSurfacedReason) }}
          </span>
          <span
            v-if="item.lastNudgedAt"
            class="px-2.5 py-1 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 text-fuchsia-100"
          >
            Nudged {{ formatRelativeAction(item.lastNudgedAt) }}
          </span>
        </div>

        <blockquote
          v-if="item.rawPhrase"
          class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
        >
          “{{ item.rawPhrase }}”
        </blockquote>

        <div
          v-if="item.followUpPrompt"
          class="rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-50"
        >
          <p class="text-[11px] uppercase tracking-[0.2em] text-amber-100/80">Missing info</p>
          <p class="mt-1">{{ item.followUpPrompt }}</p>
        </div>

        <div v-if="item.needsDate || needsTimeInput(item)" class="grid gap-3 md:grid-cols-2">
          <div v-if="item.needsDate" class="space-y-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-400">Optional due date</label>
            <input
              v-model="item.draftDate"
              type="date"
              class="w-full rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div v-if="needsTimeInput(item)" class="space-y-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-400">Optional time</label>
            <input
              v-model="item.draftTime"
              type="time"
              class="w-full rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>

        <div v-if="needsDetailsInput(item)" class="space-y-1">
          <label class="text-xs uppercase tracking-[0.2em] text-slate-400">Add detail</label>
          <textarea
            v-model="item.draftDetails"
            rows="2"
            class="w-full rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none resize-none"
            placeholder="Add context that will make the task easier to complete."
          ></textarea>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white hover:from-indigo-400 hover:to-fuchsia-400 transition disabled:opacity-60"
            :disabled="suggestionBusyId === item.id"
            @click="confirmSuggestion(item)"
          >
            {{ suggestionBusyId === item.id ? 'Confirming…' : confirmLabel(item) }}
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm font-semibold text-slate-200 hover:border-rose-300/60 hover:text-white transition disabled:opacity-60"
            :disabled="suggestionBusyId === item.id"
            @click="ignoreSuggestion(item)"
          >
            Ignore
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElNotification } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTasks } from '@/composables/useTasks'
import {
  confirmActionInboxSuggestion,
  fetchActionInbox,
  fetchActionInboxDailyIntent,
  fetchActionInboxInsights,
  ignoreActionInboxSuggestion,
  syncActionInbox,
} from '@/services/actionInboxService'

defineProps({
  eyebrow: {
    type: String,
    default: 'Action inbox',
  },
  title: {
    type: String,
    default: 'Nothing slips through your notes',
  },
  description: {
    type: String,
    default: 'Review suggested actions before they become real tasks. You stay in control.',
  },
  emptyMessage: {
    type: String,
    default: 'No suggestions waiting. Submit a note from Napkin or Journal and eligible actions will show up here automatically.',
  },
})

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const { refreshAllTasks } = useTasks()

const actionSuggestions = ref([])
const actionInboxLoading = ref(false)
const actionInboxInsights = ref(null)
const actionInboxInsightsLoading = ref(false)
const actionInboxDailyIntent = ref(null)
const actionInboxDailyIntentLoading = ref(false)
const suggestionBusyId = ref('')

const hasWorkspace = computed(() => !!workspaceStore.activeWorkspaceId)
const pendingSuggestionsLabel = computed(() => {
  const count = actionSuggestions.value.length
  if (!count) return 'Inbox empty'
  if (count === 1) return '1 suggestion'
  return `${count} suggestions`
})
const actionInboxInsightCards = computed(() => {
  const insights = actionInboxInsights.value
  if (!insights) return []
  return [
    {
      label: 'Confirm rate',
      value: formatPercent(insights.confirmationRate),
      hint: insights.decisionsCount ? `${insights.confirmedCount}/${insights.decisionsCount} decisions` : 'No decisions yet',
    },
    {
      label: 'Average confidence',
      value: formatPercent(insights.averageConfidence),
      hint: `${insights.totalSuggestions || 0} suggestions in view`,
    },
    {
      label: 'Resurfaced',
      value: String(insights.totalResurfaces || 0),
      hint: `${insights.resurfacedSuggestionCount || 0} suggestion${insights.resurfacedSuggestionCount === 1 ? '' : 's'} revisited`,
    },
    {
      label: 'Urgent pending',
      value: String(insights.urgentPendingCount || 0),
      hint: `${insights.pendingCount || 0} pending total`,
    },
    {
      label: 'External nudges',
      value: String(insights.totalNudges || 0),
      hint: `${insights.nudgedSuggestionCount || 0} suggestion${insights.nudgedSuggestionCount === 1 ? '' : 's'} escalated`,
    },
  ]
})

function mergeActionSuggestions(items = []) {
  const existingById = new Map((actionSuggestions.value || []).map((item) => [item.id, item]))
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    draftDate: existingById.get(item.id)?.draftDate ?? item.dueDate ?? '',
    draftTime: existingById.get(item.id)?.draftTime ?? extractDraftTime(item.scheduledTime),
    draftDetails: existingById.get(item.id)?.draftDetails ?? item.details ?? '',
  }))
}

async function loadActionSuggestions({ sync = false, trigger = 'manual_refresh' } = {}) {
  if (!authStore.user?.uid || !workspaceStore.activeWorkspaceId) {
    actionSuggestions.value = []
    return []
  }
  actionInboxLoading.value = true
  try {
    const suggestions = sync
      ? (
          await syncActionInbox({
            workspaceId: workspaceStore.activeWorkspaceId,
            trigger,
            limit: 24,
          })
        ).suggestions
      : await fetchActionInbox({
          workspaceId: workspaceStore.activeWorkspaceId,
          status: 'pending',
          limit: 24,
        })
    actionSuggestions.value = mergeActionSuggestions(suggestions)
    return actionSuggestions.value
  } catch (err) {
    console.warn('[ActionInboxPanel] action inbox load failed', err?.message || err)
    actionSuggestions.value = []
    return []
  } finally {
    actionInboxLoading.value = false
  }
}

async function loadActionInboxInsights({ days = 30 } = {}) {
  if (!authStore.user?.uid || !workspaceStore.activeWorkspaceId) {
    actionInboxInsights.value = null
    return null
  }
  actionInboxInsightsLoading.value = true
  try {
    actionInboxInsights.value = await fetchActionInboxInsights({
      workspaceId: workspaceStore.activeWorkspaceId,
      days,
    })
    return actionInboxInsights.value
  } catch (err) {
    console.warn('[ActionInboxPanel] action inbox insights failed', err?.message || err)
    actionInboxInsights.value = null
    return null
  } finally {
    actionInboxInsightsLoading.value = false
  }
}

async function loadActionInboxDailyIntent({ limit = 3 } = {}) {
  if (!authStore.user?.uid || !workspaceStore.activeWorkspaceId) {
    actionInboxDailyIntent.value = null
    return null
  }
  actionInboxDailyIntentLoading.value = true
  try {
    actionInboxDailyIntent.value = await fetchActionInboxDailyIntent({
      workspaceId: workspaceStore.activeWorkspaceId,
      limit,
    })
    return actionInboxDailyIntent.value
  } catch (err) {
    console.warn('[ActionInboxPanel] daily intent failed', err?.message || err)
    actionInboxDailyIntent.value = null
    return null
  } finally {
    actionInboxDailyIntentLoading.value = false
  }
}

async function refreshActionInbox({ sync = false, trigger = 'manual_refresh' } = {}) {
  const [suggestions] = await Promise.all([
    loadActionSuggestions({ sync, trigger }),
    loadActionInboxInsights(),
    loadActionInboxDailyIntent(),
  ])
  return suggestions
}

watch(
  () => authStore.user?.uid,
  (uid) => {
    if (!uid) {
      actionSuggestions.value = []
      actionInboxInsights.value = null
      actionInboxDailyIntent.value = null
      return
    }
  },
  { immediate: true },
)

watch(
  () => workspaceStore.activeWorkspaceId,
  (workspaceId) => {
    if (!workspaceId || !authStore.user?.uid) {
      actionSuggestions.value = []
      actionInboxInsights.value = null
      actionInboxDailyIntent.value = null
      return
    }
    refreshActionInbox().catch(() => {})
  },
  { immediate: true },
)

function handleInboxUpdated() {
  refreshActionInbox().catch(() => {})
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('action-inbox-updated', handleInboxUpdated)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('action-inbox-updated', handleInboxUpdated)
  }
})

function confidenceLabel(value) {
  const token = String(value || 'medium').toLowerCase()
  if (token === 'high') return 'High confidence'
  if (token === 'low') return 'Soft nudge'
  return 'Needs review'
}

function confidencePercent(item) {
  const score = Number(item?.confidenceScore)
  if (!Number.isFinite(score)) return 65
  return Math.round(Math.max(0, Math.min(1, score)) * 100)
}

function formatPercent(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0%'
  return `${Math.round(Math.max(0, Math.min(1, numeric)) * 100)}%`
}

function confidenceBadgeClass(value) {
  const token = String(value || 'medium').toLowerCase()
  if (token === 'high') return 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100'
  if (token === 'low') return 'border-amber-300/40 bg-amber-500/15 text-amber-100'
  return 'border-indigo-300/40 bg-indigo-500/15 text-indigo-100'
}

function formatReason(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatMissingField(value) {
  const token = String(value || '').trim()
  if (token === 'dueDate') return 'date'
  return token || 'details'
}

function formatSurfacedReason(value) {
  const token = String(value || '').trim()
  if (token === 'deadline_today') return 'due today'
  if (token === 'deadline_2d') return 'deadline soon'
  if (token === 'deadline_7d') return 'upcoming deadline'
  if (token === 'scheduled_2h') return 'starts soon'
  if (token === 'scheduled_1d') return 'tomorrow'
  if (token === 'clarify_once') return 'needs timing'
  return formatReason(token)
}

function formatRelativeAction(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.round(diffMs / 3600000)
  if (diffHours <= 1) return 'recently'
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffMs / 86400000)
  if (diffDays <= 1) return 'yesterday'
  return `${diffDays}d ago`
}

function extractDraftTime(value) {
  const token = String(value || '').trim()
  const match = token.match(/T(\d{2}:\d{2})/)
  return match ? match[1] : ''
}

function needsTimeInput(item) {
  return !!item?.scheduledTime || (Array.isArray(item?.missingFields) && item.missingFields.includes('time'))
}

function needsDetailsInput(item) {
  return Array.isArray(item?.missingFields) && item.missingFields.includes('details')
}

function buildScheduledTimePayload(item) {
  const dateValue = String(item?.draftDate || item?.dueDate || '').trim()
  const timeValue = String(item?.draftTime || '').trim()
  if (dateValue && timeValue) return `${dateValue}T${timeValue}`
  return item?.scheduledTime || null
}

function formatSuggestionTiming(item) {
  if (item?.scheduledTime) {
    const date = new Date(item.scheduledTime)
    if (!Number.isNaN(date.getTime())) {
      return `Scheduled ${date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    }
  }
  if (item?.dueDate) {
    const date = new Date(`${item.dueDate}T00:00:00`)
    if (!Number.isNaN(date.getTime())) {
      return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    }
    return `Due ${item.dueDate}`
  }
  return 'No date detected'
}

function suggestionSummary(item) {
  if (item?.followUpPrompt) return item.followUpPrompt
  if (item?.reason) return item.reason
  if (item?.rationale) return item.rationale
  if (needsDetailsInput(item)) return 'The action looks real, but it needs a bit more detail before it becomes a great task.'
  if (item?.needsDate || needsTimeInput(item)) return 'The action looks real, but timing is still missing.'
  if (item?.confidence === 'high') return 'This looked like a clear commitment with enough context to surface now.'
  if (item?.confidence === 'low') return 'This may matter, but the note is still a bit ambiguous.'
  return 'This looks actionable, but it should be reviewed before becoming a task.'
}

function confirmLabel(item) {
  if (item?.confidence === 'low') return 'Convert to task'
  if (item?.needsDate || needsTimeInput(item) || needsDetailsInput(item)) return 'Complete & confirm'
  return 'Confirm'
}

function timezoneGuess() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

async function confirmSuggestion(item) {
  if (!item?.id || !workspaceStore.activeWorkspaceId) return
  suggestionBusyId.value = item.id
  try {
    const { task } = await confirmActionInboxSuggestion(item.id, {
      workspaceId: workspaceStore.activeWorkspaceId,
      title: item.displayTitle || item.title,
      details: item.draftDetails || item.details || '',
      category: item.category || 'Other',
      date: item.draftDate || item.dueDate || null,
      scheduledTime: buildScheduledTimePayload(item),
      timeHint: item.timeHint || null,
      timezone: timezoneGuess(),
    })
    await refreshActionInbox()
    await refreshAllTasks()
    ElNotification({
      title: 'Task created',
      message: task?.title || item.displayTitle || item.title || 'Your task was created.',
      type: 'success',
    })
  } catch (err) {
    ElNotification({
      title: 'Unable to confirm',
      message: err?.response?.data?.error || err?.message || 'We could not create that task.',
      type: 'error',
    })
  } finally {
    suggestionBusyId.value = ''
  }
}

async function ignoreSuggestion(item) {
  if (!item?.id || !workspaceStore.activeWorkspaceId) return
  suggestionBusyId.value = item.id
  try {
    await ignoreActionInboxSuggestion(item.id, {
      workspaceId: workspaceStore.activeWorkspaceId,
    })
    await refreshActionInbox()
    ElNotification({
      title: 'Suggestion ignored',
      message: 'We removed it for now and will only resurface it later if timing makes it important.',
      type: 'success',
    })
  } catch (err) {
    ElNotification({
      title: 'Unable to ignore',
      message: err?.response?.data?.error || err?.message || 'We could not update that suggestion.',
      type: 'error',
    })
  } finally {
    suggestionBusyId.value = ''
  }
}
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.45s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
