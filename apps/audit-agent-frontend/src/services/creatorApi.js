import axios from 'axios'
import { buildAuthHeaders } from '@/services/leader/http'
import { refreshAppToken } from '@/services/appTokenService'

const creatorBase = (import.meta.env.VITE_CREATOR_API_BASE || '/creator-api').replace(/\/+$/, '')
const creatorClient = axios.create({
  baseURL: creatorBase,
  timeout: 30000,
})

creatorClient.interceptors.request.use(async (config) => {
  try {
    const headers = await buildAuthHeaders()
    config.headers = { ...(config.headers || {}), ...headers }

    // Also include appToken as query/body for services that accept it outside headers
    const appToken = headers['x-app-token']
    if (appToken) {
      if (config.method?.toLowerCase() === 'get') {
        config.params = { ...(config.params || {}), appToken }
      } else {
        if (config.data && typeof config.data === 'object' && !Array.isArray(config.data)) {
          config.data = { appToken, ...config.data }
        } else {
          config.data = { appToken }
        }
      }
    }
  } catch {}
  return config
})

creatorClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    const original = error?.config || {}
    if (status === 401 && !original._retry) {
      try {
        original._retry = true
        await refreshAppToken()
        const headers = await buildAuthHeaders({ forceRefresh: true })
        original.headers = { ...(original.headers || {}), ...headers }
        return creatorClient(original)
      } catch (retryErr) {
        return Promise.reject(retryErr)
      }
    }
    return Promise.reject(error)
  },
)

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
