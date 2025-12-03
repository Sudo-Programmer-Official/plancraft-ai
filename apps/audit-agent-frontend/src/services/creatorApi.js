import axios from 'axios'
import { auth } from '@/firebase/init'
import { getAppToken } from '@/services/appTokenService'

const creatorBase = (import.meta.env.VITE_CREATOR_API_BASE || '/creator-api').replace(/\/+$/, '')
const creatorClient = axios.create({
  baseURL: creatorBase,
  timeout: 30000,
})

creatorClient.interceptors.request.use(async (config) => {
  try {
    const token = await auth?.currentUser?.getIdToken?.()
    if (token) config.headers.Authorization = `Bearer ${token}`
    // Allow service app token fallback to satisfy creator-service verifyAuth
    const envAppToken =
      import.meta.env.VITE_CREATOR_APP_TOKEN ||
      import.meta.env.VITE_SERVICE_APP_TOKEN ||
      import.meta.env.VITE_APP_TOKEN
    if (envAppToken) config.headers['x-app-token'] = envAppToken
    const cached = getAppToken()
    if (cached) config.headers['x-app-token'] = cached
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
  const { data } = await creatorClient.post('/creator/repurpose', {
    source: payload.sourceContent || payload.source,
    formats: payload.targetFormats || payload.formats,
  })
  return data
}

export async function fetchCreatorBoard() {
  const { data } = await creatorClient.get('/creator/board')
  return {
    drafts: data?.drafts || data?.board?.drafts || [],
    inspiration: data?.inspiration || data?.board?.inspiration || [],
    scheduled: data?.scheduled || data?.board?.scheduled || [],
  }
}

export async function fetchCreatorSlots(params = {}) {
  const { data } = await creatorClient.get('/creator/slots', { params })
  return data?.slots || []
}

export async function createCreatorSlot(payload) {
  const { data } = await creatorClient.post('/creator/slots', payload)
  return data?.slot || data
}

export async function fetchVariant(id) {
  const { data } = await creatorClient.get(`/creator/variants/${id}`)
  return data?.variant || data
}

export async function updateVariant(id, payload) {
  const { data } = await creatorClient.patch(`/creator/variants/${id}`, payload)
  return data?.variant || data
}

export async function recordCreatorMedia(payload) {
  const { data } = await creatorClient.post('/creator/media', payload)
  return data?.media || data
}

export async function saveVariantDraft(id, payload) {
  const { data } = await creatorClient.post('/creator/editor/save', { id, ...payload })
  return data?.content || data
}
