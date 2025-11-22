import axios from 'axios'
import { auth } from '@/firebase/init'

const postingBase = (import.meta.env.VITE_POSTING_API_BASE || '/posting-api').replace(/\/+$/, '')
const postingClient = axios.create({
  baseURL: postingBase,
  timeout: 30000,
})

postingClient.interceptors.request.use(async (config) => {
  try {
    const token = await auth?.currentUser?.getIdToken?.()
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

export async function publishNow(payload) {
  const { data } = await postingClient.post('/publish', payload)
  return data
}

export async function schedulePost(payload) {
  const { data } = await postingClient.post('/publish', payload)
  return data
}
