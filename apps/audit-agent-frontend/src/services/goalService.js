import api from '@/services/api'

function deriveGoalApiBase() {
  const direct = import.meta.env.VITE_GOALS_API_BASE
  if (direct && typeof direct === 'string') return direct.replace(/\/+$/, '')
  const root = import.meta.env.VITE_API_BASE_ROOT
  if (root && typeof root === 'string') return `${root.replace(/\/+$/, '')}/goals`
  const alt = import.meta.env.VITE_API_BASE_URL
  if (alt && typeof alt === 'string') {
    try {
      const url = new URL(alt)
      return `${url.origin}/api/goals`
    } catch {}
  }
  return '/api/goals'
}

const baseURL = deriveGoalApiBase()

function withUserId(payload = {}, userId) {
  if (!userId) return payload
  return { ...payload, userId }
}

export async function listGoals(userId, params = {}) {
  const response = await api.get('/list', {
    baseURL,
    params: { ...params, userId },
  })
  return response?.data?.goals || []
}

export async function createGoal(payload = {}, userId) {
  const response = await api.post('/create', withUserId(payload, userId), { baseURL })
  return response?.data?.goal
}

export async function updateGoal(goalId, payload = {}, userId) {
  if (!goalId) throw new Error('updateGoal requires goalId')
  const response = await api.patch(`/${goalId}`, withUserId(payload, userId), { baseURL })
  return response?.data?.goal
}

export async function deleteGoal(goalId, userId, options = {}) {
  if (!goalId) throw new Error('deleteGoal requires goalId')
  return api.delete(`/${goalId}`, {
    baseURL,
    data: withUserId({ hardDelete: options.hardDelete === true }, userId),
  })
}

export async function suggestMilestones(payload = {}, userId) {
  const response = await api.post('/milestones/suggest', withUserId(payload, userId), { baseURL })
  return response?.data?.suggestions || []
}

export async function fetchGoalSummary(userId) {
  const response = await api.get('/summary', {
    baseURL,
    params: { userId },
  })
  return response?.data?.summary || null
}

export async function createGoalReflection(payload = {}, userId) {
  const response = await api.post('/reflect', withUserId(payload, userId), { baseURL })
  return response?.data?.reflection || null
}

export async function listGoalReflections(userId, params = {}) {
  const response = await api.get('/reflect', {
    baseURL,
    params: { ...params, userId },
  })
  return response?.data?.reflections || []
}
