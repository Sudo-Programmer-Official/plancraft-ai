import { goalsClient, growthClient, nlpClient, postingClient } from './http'

export interface Occasion {
  id?: string
  name: string
  type: 'birthday' | 'anniversary' | string
  date: string
  message?: string
  contactId?: string
  groupId?: string
  tags?: string[]
}

const mapOccasion = (raw: any): Occasion => ({
  id: raw?.id || raw?._id || raw?.occasionId,
  name: raw?.name || raw?.title || 'Occasion',
  type: raw?.type || raw?.category || 'occasion',
  date: raw?.date || raw?.when,
  message: raw?.message || raw?.note,
  contactId: raw?.contactId,
  groupId: raw?.groupId,
  tags: raw?.tags || [],
})

export async function listOccasions(): Promise<Occasion[]> {
  const { data } = await growthClient.get('/leader/occasions')
  return (data?.occasions || []).map(mapOccasion)
}

export async function createOccasion(payload: Occasion): Promise<Occasion> {
  const { data } = await growthClient.post('/leader/occasions', payload)
  return mapOccasion(data?.occasion || payload)
}

export async function updateOccasion(id: string, payload: Partial<Occasion>): Promise<Occasion> {
  try {
    const { data } = await growthClient.put(`/leader/occasions/${id}`, payload)
    return mapOccasion(data?.occasion || { ...payload, id })
  } catch (error: any) {
    // Fallback for older deployments that only accept PATCH
    if (error?.response?.status === 404) {
      const { data } = await growthClient.patch(`/leader/occasions/${id}`, payload)
      return mapOccasion(data?.occasion || { ...payload, id })
    }
    throw error
  }
}

export async function deleteOccasion(id: string) {
  await growthClient.delete(`/leader/occasions/${id}`)
  return true
}

export async function recommendOccasionMessage(payload: Occasion) {
  const { data } = await goalsClient.post('/leader/occasions/recommend', payload)
  return data?.message || data?.text || data?.output || ''
}

export async function previewOccasionMessage(payload: Occasion) {
  const prompt = `Draft a warm ${payload.type} message for ${payload.name} on ${payload.date}. Keep it short and personal.`
  const { data } = await nlpClient.post('/generate/outreach-message', { input: prompt })
  return data?.output || data?.text || data?.message || ''
}

export async function scheduleOccasion(payload: Occasion & { scheduleAt?: string; channel?: string }) {
  const { data } = await postingClient.post('/messages/schedule', {
    channel: payload.channel || 'whatsapp',
    mode: 'text',
    recipients: payload.contactId ? [{ contactId: payload.contactId }] : [],
    groups: payload.groupId ? [{ groupId: payload.groupId }] : [],
    message: payload.message,
    scheduleAt: payload.scheduleAt || payload.date,
    context: { reason: 'occasion', type: payload.type },
  })
  return data
}
