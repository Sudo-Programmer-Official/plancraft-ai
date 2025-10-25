import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { trackEvent } from '@/services/analytics'
import { useAuthStore } from '@/stores/authStore'

export interface CoachStep {
  id: string
  title: string
  description: string
  tip?: string
  icon?: string
  actionLabel?: string
  routeName?: string
}

interface CoachState {
  startedAt: string | null
  completedSteps: string[]
  dismissed: boolean
  finishedAt: string | null
}

interface CoachOptions {
  autostart?: boolean
}

const STORAGE_KEY = 'teams:firstRunCoach:v1'

const DEFAULT_STEPS: CoachStep[] = [
  {
    id: 'sample-project',
    title: 'Explore your sample project',
    description: 'Start in Projects to review the seeded “Getting Started” board and tasks.',
    tip: 'Open the project and assign a task to yourself to get rolling.',
    icon: '🗂️',
    actionLabel: 'Open Projects',
    routeName: 'team-projects',
  },
  {
    id: 'chat-intro',
    title: 'Say hello in team chat',
    description: 'Drop a quick intro in the chat channel to kick off collaboration.',
    tip: 'Try @ mentioning yourself or teammates once they join.',
    icon: '💬',
    actionLabel: 'Go to Chat',
    routeName: 'team-chat',
  },
  {
    id: 'meeting-walkthrough',
    title: 'Check the meeting room',
    description: 'Visit Meetings to review the agenda and try the quick mic.',
    tip: 'Schedule a stand-up or sync to keep everyone aligned.',
    icon: '📅',
    actionLabel: 'Open Meetings',
    routeName: 'team-meetings',
  },
  {
    id: 'vault-tour',
    title: 'Upload something to the vault',
    description: 'Drop a note or doc into the vault to keep shared knowledge handy.',
    tip: 'You can store links, notes, and AI summaries for easy retrieval.',
    icon: '🗄️',
    actionLabel: 'Go to Vault',
    routeName: 'team-vault',
  },
]

function createDefaultState(): CoachState {
  return {
    startedAt: null,
    completedSteps: [],
    dismissed: false,
    finishedAt: null,
  }
}

function loadPersistedState(): Record<string, CoachState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).reduce<Record<string, CoachState>>((acc, [key, value]) => {
        if (
          value &&
          typeof value === 'object' &&
          Array.isArray((value as CoachState).completedSteps)
        ) {
          acc[key] = {
            ...createDefaultState(),
            ...(value as CoachState),
            completedSteps: Array.isArray(value.completedSteps)
              ? value.completedSteps.map((id: unknown) => String(id))
              : [],
          }
        }
        return acc
      }, {})
    }
  } catch (err) {
    console.warn('[firstRunCoachStore] Failed to load state', err)
  }
  return {}
}

export const useFirstRunCoachStore = defineStore('firstRunCoach', () => {
  const authStore = useAuthStore()
  const activeOrgId = ref<string | null>(null)
  const overlayOpen = ref(false)
  const celebrationKey = ref<number | null>(null)
  const stateMap = ref<Record<string, CoachState>>(loadPersistedState())

  const steps = ref<CoachStep[]>(DEFAULT_STEPS)

  const userKey = computed(() => authStore.user?.uid || 'guest')
  const currentKey = computed(() =>
    activeOrgId.value ? `${userKey.value}:${activeOrgId.value}` : null,
  )

  const currentState = computed<CoachState | null>(() => {
    const key = currentKey.value
    if (!key) return null
    const state = stateMap.value[key]
    return state ?? null
  })

  const completedSet = computed<Set<string>>(() => {
    const state = currentState.value
    return new Set(state?.completedSteps ?? [])
  })

  const completedCount = computed(() => completedSet.value.size)
  const totalSteps = computed(() => steps.value.length)

  const progress = computed(() =>
    totalSteps.value === 0 ? 0 : completedCount.value / totalSteps.value,
  )

  const nextStep = computed<CoachStep | null>(() => {
    return steps.value.find((step) => !completedSet.value.has(step.id)) ?? null
  })

  const finished = computed(() => {
    if (!currentState.value) return false
    if (currentState.value.finishedAt) return true
    return steps.value.length > 0 && completedSet.value.size >= steps.value.length
  })

  const canResume = computed(() => {
    if (!currentState.value) return false
    if (currentState.value.dismissed) return false
    return !finished.value
  })

  function persist() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateMap.value))
    } catch (err) {
      console.warn('[firstRunCoachStore] Failed to persist state', err)
    }
  }

  watch(
    stateMap,
    () => {
      persist()
    },
    { deep: true },
  )

  function ensureState(orgId?: string) {
    const targetOrgId = orgId || activeOrgId.value
    if (!targetOrgId) return null
    const key = `${userKey.value}:${targetOrgId}`
    const existing = stateMap.value[key]
    if (existing) return { key, state: existing }

    const created = createDefaultState()
    stateMap.value = {
      ...stateMap.value,
      [key]: created,
    }
    return { key, state: created }
  }

  function updateState(key: string, updates: Partial<CoachState>) {
    const prev = stateMap.value[key] ?? createDefaultState()
    stateMap.value = {
      ...stateMap.value,
      [key]: {
        ...prev,
        ...updates,
      },
    }
    return stateMap.value[key]
  }

  function initForOrg(orgId: string | null, options: CoachOptions = {}) {
    if (!orgId) return
    activeOrgId.value = orgId
    const { key, state } = ensureState(orgId) ?? { key: null, state: null }
    if (!key || !state) return

    if (options.autostart !== false) {
      if (!state.startedAt && !state.dismissed) {
        startOnboarding({ trigger: 'auto' })
      } else if (!state.dismissed && !state.finishedAt) {
        overlayOpen.value = true
      }
    }
  }

  function startOnboarding(meta: { trigger?: 'auto' | 'manual' } = {}) {
    const entry = ensureState()
    if (!entry) return
    const { key, state } = entry

    if (state.dismissed) return

    const alreadyStarted = !!state.startedAt
    const startedAt = state.startedAt || new Date().toISOString()

    updateState(key, {
      startedAt,
      dismissed: false,
    })

    overlayOpen.value = true

    if (!alreadyStarted) {
      trackEvent('onboarding_started', {
        orgId: activeOrgId.value,
        trigger: meta.trigger || 'manual',
        totalSteps: steps.value.length,
      })
    }
  }

  function openOverlay() {
    if (canResume.value || finished.value) {
      overlayOpen.value = true
    }
  }

  function closeOverlay() {
    overlayOpen.value = false
  }

  function skipOnboarding() {
    const entry = ensureState()
    if (!entry) return
    const { key } = entry
    updateState(key, {
      dismissed: true,
    })
    overlayOpen.value = false
    trackEvent('onboarding_skipped', {
      orgId: activeOrgId.value,
      completedSteps: completedCount.value,
      totalSteps: steps.value.length,
    })
  }

  function replayOnboarding() {
    const entry = ensureState()
    if (!entry) return
    const { key } = entry
    updateState(key, {
      startedAt: new Date().toISOString(),
      completedSteps: [],
      dismissed: false,
      finishedAt: null,
    })
    overlayOpen.value = true
    trackEvent('onboarding_replayed', {
      orgId: activeOrgId.value,
      totalSteps: steps.value.length,
    })
  }

  function completeStep(stepId: string) {
    const entry = ensureState()
    if (!entry) return
    const { key, state } = entry
    if (completedSet.value.has(stepId)) return

    const updatedSteps = [...state.completedSteps, stepId]
    updateState(key, { completedSteps: updatedSteps })

    trackEvent('step_completed', {
      orgId: activeOrgId.value,
      stepId,
      completedSteps: updatedSteps.length,
      totalSteps: steps.value.length,
    })

    if (updatedSteps.length >= steps.value.length && steps.value.length > 0) {
      finishOnboarding()
    }
  }

  function finishOnboarding() {
    const entry = ensureState()
    if (!entry) return
    const { key, state } = entry
    if (state.finishedAt) return

    const finishedAt = new Date().toISOString()
    updateState(key, { finishedAt })
    overlayOpen.value = true
    celebrationKey.value = Date.now()

    trackEvent('onboarding_finished', {
      orgId: activeOrgId.value,
      totalSteps: steps.value.length,
      durationSeconds: state.startedAt
        ? Math.max(
            0,
            Math.round(
              (new Date(finishedAt).getTime() - new Date(state.startedAt).getTime()) / 1000,
            ),
          )
        : null,
    })
  }

  function consumeCelebrationKey() {
    const value = celebrationKey.value
    celebrationKey.value = null
    return value
  }

  return {
    steps: computed(() => steps.value),
    overlayOpen: computed(() => overlayOpen.value),
    celebrationKey: computed(() => celebrationKey.value),
    progress,
    completedCount,
    totalSteps,
    nextStep,
    finished,
    canResume,
    activeOrgId,
    currentState,
    initForOrg,
    startOnboarding,
    openOverlay,
    closeOverlay,
    skipOnboarding,
    replayOnboarding,
    completeStep,
    finishOnboarding,
    consumeCelebrationKey,
  }
})
