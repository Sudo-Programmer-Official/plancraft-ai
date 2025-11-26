import { growthClient, nlpClient } from './http'

export interface LeaderEvent {
  id?: string
  title: string
  description?: string
  date?: string
  time?: string
  location?: string
  tags?: string[]
  category?: string
  createdAt?: string
  updatedAt?: string
}

const mapEvent = (raw: any): LeaderEvent => ({
  id: raw?.id || raw?._id || raw?.eventId,
  title: raw?.title || raw?.name || 'Untitled event',
  description: raw?.description || raw?.details || '',
  date: raw?.date || raw?.when || raw?.startDate,
  time: raw?.time || raw?.startTime,
  location: raw?.location || raw?.place || '',
  tags: raw?.tags || raw?.labels || [],
  category: raw?.category,
  createdAt: raw?.createdAt,
  updatedAt: raw?.updatedAt,
})

export async function listLeaderEvents(): Promise<LeaderEvent[]> {
  const { data } = await growthClient.get('/leader/events')
  return (data?.events || []).map(mapEvent)
}

export async function createLeaderEvent(payload: LeaderEvent): Promise<LeaderEvent> {
  const { data } = await growthClient.post('/leader/events', payload)
  return mapEvent(data?.event || payload)
}

export async function updateLeaderEvent(id: string, payload: Partial<LeaderEvent>): Promise<LeaderEvent> {
  const { data } = await growthClient.put(`/leader/events/${id}`, payload)
  return mapEvent(data?.event || { ...payload, id })
}

export async function deleteLeaderEvent(id: string) {
  await growthClient.delete(`/leader/events/${id}`)
  return true
}

export async function fetchEventStats() {
  const { data } = await growthClient.get('/events/stats')
  return data
}

export async function suggestEventCopy(input: { title?: string; description?: string; context?: string }) {
  const prompt = [
    'Create a concise event title and one-line description.',
    input.title ? `Title: ${input.title}` : '',
    input.description ? `Details: ${input.description}` : '',
    input.context ? `Context: ${input.context}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const { data } = await nlpClient.post('/generate/outreach-message', { input: prompt })
  const output = data?.output || data?.text || data?.message || ''
  const [firstLine, ...rest] = output.split('\n').filter(Boolean)
  return {
    title: firstLine || input.title || 'New event',
    description: rest.join(' ').trim() || output || input.description || '',
  }
}
