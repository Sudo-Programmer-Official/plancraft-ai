import axios from 'axios'

export async function callAi(type, input, token, workspaceId = null) {
  const base = (process.env.AI_NLP_SERVICE_URL || '').replace(/\/+$/, '')
  if (!base) throw new Error('Missing AI_NLP_SERVICE_URL')
  const url = `${base}/api/ai/generate/${type}`
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (workspaceId) headers['x-workspace-id'] = workspaceId
  const { data } = await axios.post(url, { input, workspaceId }, { headers })
  return data?.output || ''
}
