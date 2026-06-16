import api from '@/services/api'
import { auth } from '@/firebase/init'
import axios from 'axios'
import { getAppToken } from '@/services/appTokenService'

async function authedHeaders() {
  const headers = {}
  try {
    const token = await auth?.currentUser?.getIdToken?.()
    if (token) headers.Authorization = `Bearer ${token}`
    const envAppToken =
      import.meta.env.VITE_SERVICE_APP_TOKEN ||
      import.meta.env.VITE_APP_TOKEN
    if (envAppToken) headers['x-app-token'] = envAppToken
    const cached = getAppToken()
    if (cached) headers['x-app-token'] = cached
  } catch {}
  return headers
}

function getNlpBase() {
  const direct = import.meta.env.VITE_NLP_API_BASE
  if (direct) {
    if (typeof window !== 'undefined' && /^https?:\/\//i.test(direct)) {
      try {
        if (new URL(direct).origin !== window.location.origin) {
          return '/api/nlp'
        }
      } catch {
        return '/api/nlp'
      }
    }
    return direct.replace(/\/+$/, '')
  }
  return '/api/nlp'
}

function getGrowthBase() {
  // Prefer explicit base, then service URL, finally dev proxy prefix
  const direct = import.meta.env.VITE_GROWTH_API_BASE
  if (direct) return direct.replace(/\/+$/, '')
  const svc = import.meta.env.VITE_GROWTH_SERVICE_URL
  if (svc) return `${svc.replace(/\/+$/, '')}/api/growth`
  return '/growth-api'
}

export async function scheduleMessage(payload) {
  const headers = await authedHeaders()
  const { data } = await api.post('/posting-api/messages/schedule', payload, { headers })
  return data
}

export async function ocrImage(formData) {
  const headers = await authedHeaders()
  const url = `${getNlpBase()}/ocr`
  const { data } = await axios.post(url, formData, { headers })
  return data
}

export async function extractEventDetails(payload) {
  const headers = await authedHeaders()
  const url = `${getNlpBase()}/extract-event`
  const { data } = await axios.post(url, payload, { headers })
  return data
}

export async function generateWish(payload) {
  const headers = await authedHeaders()
  const url = `${getNlpBase()}/generate-wish`
  const { data } = await axios.post(url, payload, { headers })
  return data
}

export async function fetchContacts() {
  const headers = await authedHeaders()
  const url = `${getGrowthBase()}/contacts`
  const { data } = await api.get(url, { headers })
  return data?.contacts || []
}

export async function fetchGroups() {
  const headers = await authedHeaders()
  const url = `${getGrowthBase()}/contacts/groups`
  const { data } = await api.get(url, { headers })
  return data?.groups || []
}

export async function uploadAudio(file) {
  const headers = await authedHeaders()
  const formData = new FormData()
  formData.append('file', file)
  const url = '/posting-api/media/audio'
  const { data } = await api.post(url, formData, { headers })
  return data?.url
}
