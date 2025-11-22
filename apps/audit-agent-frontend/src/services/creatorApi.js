import axios from 'axios'
import { auth } from '@/firebase/init'

const creatorBase = (import.meta.env.VITE_CREATOR_API_BASE || '/creator-api').replace(/\/+$/, '')
const creatorClient = axios.create({
  baseURL: creatorBase,
  timeout: 30000,
})

creatorClient.interceptors.request.use(async (config) => {
  try {
    const token = await auth?.currentUser?.getIdToken?.()
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

export async function fetchCreatorPlan(id) {
  if (!id) return {}
  const { data } = await creatorClient.get(`/creator/plan/${id}`)
  return data?.plan || data || {}
}

export async function saveCreatorPlan(id, payload) {
  if (id === 'new') {
    const { data } = await creatorClient.post('/creator/plan/create', payload)
    return data?.plan || payload
  }
  const { data } = await creatorClient.put(`/creator/plan/${id}`, payload)
  return data?.plan || payload
}

export async function runRepurpose(payload) {
  const { data } = await creatorClient.post('/creator/ai/repurpose', payload)
  return data
}
