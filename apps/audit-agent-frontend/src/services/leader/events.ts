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

const normalizePayload = (payload: LeaderEvent) => {
  const datePart = payload?.date
  const timePart = payload?.time || '00:00'
  const start = payload?.start || (datePart ? new Date(`${datePart}T${timePart}`).toISOString() : undefined)
  return {
    ...payload,
    start,
    locationText: payload.location,
  }
}

const mapEvent = (raw: any): LeaderEvent => {
  const start = raw?.start ? new Date(raw.start) : null
  return {
    id: raw?.id || raw?._id || raw?.eventId,
    title: raw?.title || raw?.name || 'Untitled event',
    description: raw?.description || raw?.details || raw?.notes || '',
    date: raw?.date || raw?.when || raw?.startDate || (start ? start.toISOString().slice(0, 10) : undefined),
    time: raw?.time || raw?.startTime || (start ? start.toISOString().slice(11, 16) : undefined),
    location: raw?.locationText || raw?.location || raw?.place || '',
    tags: raw?.tags || raw?.labels || [],
    category: raw?.category,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  }
}

export async function listLeaderEvents(): Promise<LeaderEvent[]> {
  const { data } = await growthClient.get('/leader/events')
  return (data?.events || []).map(mapEvent)
}

export async function createLeaderEvent(payload: LeaderEvent): Promise<LeaderEvent> {
  const { data } = await growthClient.post('/leader/events', normalizePayload(payload))
  return mapEvent(data?.event || payload)
}

export async function updateLeaderEvent(id: string, payload: Partial<LeaderEvent>): Promise<LeaderEvent> {
  const { data } = await growthClient.put(`/leader/events/${id}`, normalizePayload(payload as LeaderEvent))
  return mapEvent(data?.event || { ...payload, id })
}

export async function deleteLeaderEvent(id: string) {
  await growthClient.delete(`/leader/events/${id}`)
  return true
}

export async function fetchEventStats() {
  const { data } = await growthClient.get('/leader/events/stats')
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
