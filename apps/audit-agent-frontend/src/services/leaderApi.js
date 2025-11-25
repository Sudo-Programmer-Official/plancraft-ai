import api from '@/services/api'
import { auth } from '@/firebase/init'
import axios from 'axios'

async function authedHeaders() {
  const headers = {}
  try {
    const token = await auth?.currentUser?.getIdToken?.()
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {}
  return headers
}

function getNlpBase() {
  return import.meta.env.VITE_NLP_API_BASE || (import.meta.env.VITE_AI_NLP_URL ? `${import.meta.env.VITE_AI_NLP_URL}/api/ai` : '/nlp-api')
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
  const url = '/growth-api/contacts'
  const { data } = await api.get(url, { headers })
  return data?.contacts || []
}

export async function fetchGroups() {
  const headers = await authedHeaders()
  const url = '/growth-api/contacts/groups'
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
