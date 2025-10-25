import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet, apiPost } from '@/lib/api'

export interface PulseContributor {
  owner: string
  completed: number
  updated: number
}

export interface PulseHighlight {
  id: string
  title: string
  status?: string
  progress?: number | null
  assignedTo?: string | null
  updatedAt?: string | Date
}

export interface PulseStats {
  totals: {
    total: number
    completed: number
    active: number
    blocked: number
    overdue: number
    completionRate: number
  }
  topContributors: PulseContributor[]
  highlights: PulseHighlight[]
  sentiment: {
    average: number
    trend: Array<{ id: string; score: number; createdAt?: string | Date }>
  }
}

export interface MonthlyInsights {
  streak: number
  positiveDays: number
  badges: Array<{ id: string; label: string; description: string }>
}

export interface WeeklyPulse {
  stats: PulseStats
  summary: { text: string; model: string | null; generatedAt: string }
  reflections: Array<Record<string, any>>
  monthly: MonthlyInsights
  audio?: { url: string } | null
}

export interface CoachResponse {
  text: string
  model: string | null
  speechUrl?: string | null
}

export const useTeamPulseStore = defineStore('team-pulse', () => {
  const weekly = ref<WeeklyPulse | null>(null)
  const loading = ref(false)
  const coachLoading = ref(false)
  const coach = ref<CoachResponse | null>(null)
  const error = ref<string | null>(null)

  async function loadWeekly(orgId: string, projectId: string, opts: { audio?: boolean } = {}) {
    if (!orgId || !projectId) return null
    loading.value = true
    error.value = null
    try {
      const query = opts.audio ? '?audio=true' : ''
      const data = await apiGet(`/api/orgs/${orgId}/projects/${projectId}/pulse/weekly${query}`)
      weekly.value = data
      return data
    } catch (err: any) {
      console.error('Failed to load weekly pulse', err)
      error.value = err?.message || 'Failed to load weekly pulse'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function requestCoach(orgId: string, projectId: string, prompt?: string) {
    if (!orgId || !projectId) return null
    coachLoading.value = true
    error.value = null
    try {
      const summary = weekly.value?.summary?.text || null
      const payload: Record<string, any> = {}
      if (prompt) payload.prompt = prompt
      if (summary) payload.summary = summary
      const data = await apiPost(`/api/orgs/${orgId}/projects/${projectId}/pulse/coach`, payload)
      coach.value = data
      return data
    } catch (err: any) {
      console.error('Failed to fetch coach response', err)
      error.value = err?.message || 'Failed to fetch coach response'
      throw err
    } finally {
      coachLoading.value = false
    }
  }

  function clear() {
    weekly.value = null
    coach.value = null
    error.value = null
  }

  return {
    weekly,
    loading,
    coach,
    coachLoading,
    error,
    loadWeekly,
    requestCoach,
    clear,
  }
})
