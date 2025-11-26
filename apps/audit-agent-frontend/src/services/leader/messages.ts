import { creatorClient, growthClient, nlpClient, postingClient } from './http'

export interface RecipientRef {
  contactId?: string
  groupId?: string
  name?: string
}

export interface MessageSchedulePayload {
  channel: 'whatsapp' | 'sms' | 'voice_call' | string
  mode: 'text' | 'voice' | 'text_and_voice' | string
  recipients?: RecipientRef[]
  groups?: RecipientRef[]
  message?: string | null
  audioUrl?: string | null
  scheduleAt?: string
  context?: Record<string, any>
}

export async function fetchMessageStats() {
  const { data } = await postingClient.get('/messages/stats')
  return data
}

export async function fetchContactsForMessaging() {
  const [{ data: contactsRes }, { data: groupsRes }] = await Promise.all([
    growthClient.get('/leader/contacts'),
    growthClient.get('/leader/contacts/groups'),
  ])
  return {
    contacts: contactsRes?.contacts || [],
    groups: groupsRes?.groups || [],
  }
}

export async function generateMessageDraft(prompt: string) {
  const { data } = await nlpClient.post('/generate/outreach-message', { input: prompt })
  return data?.output || data?.text || data?.message || ''
}

export async function createMessageTemplate(payload: { title: string; body: string; tags?: string[] }) {
  const { data } = await creatorClient.post('/creator/plan/create', {
    name: payload.title,
    content: payload.body,
    tags: payload.tags || ['leader-message'],
    type: 'message-template',
  })
  return data?.plan || data
}

export async function scheduleLeaderMessage(payload: MessageSchedulePayload) {
  const { data } = await postingClient.post('/messages/schedule', payload)
  return data
}

export async function uploadVoiceMedia(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await postingClient.post('/media/audio', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data?.url || data?.audioUrl || ''
}
