import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet, apiPost } from '../lib/api'

export interface MeetingPayload {
  title: string
  startAt?: string | Date | null
  endAt?: string | Date | null
  attendees?: string[]
  notes?: string
}

export interface Meeting extends MeetingPayload {
  id: string
  transcript?: string
  summary?: string
  transcriptReady?: boolean
  generatedTaskPreview?: Array<{ title: string; status: string; priority: string }>
  createdAt?: string | Date
  updatedAt?: string | Date
}

export const useMeetingStore = defineStore('meeting', () => {
  const meetings = ref<Meeting[]>([])
  const loading = ref(false)
  const ingesting = ref(false)

  function upsert(rawMeeting: any) {
    const { tasks, ...meeting } = rawMeeting || {}
    if (!meeting?.id) return
    const idx = meetings.value.findIndex((m) => m.id === meeting.id)
    if (idx >= 0) meetings.value[idx] = { ...meetings.value[idx], ...meeting }
    else meetings.value.unshift(meeting)
  }

  async function load(orgId: string) {
    if (!orgId) return []
    loading.value = true
    try {
      const res = await apiGet(`/api/orgs/${orgId}/meetings`)
      meetings.value = Array.isArray(res) ? res : []
      return meetings.value
    } finally {
      loading.value = false
    }
  }

  async function ingest(orgId: string, payload: MeetingPayload) {
    if (!orgId) throw new Error('Missing orgId')
    ingesting.value = true
    try {
      const meeting = await apiPost(`/api/orgs/${orgId}/meetings/ingest`, payload)
      upsert(meeting)
      return meeting
    } finally {
      ingesting.value = false
    }
  }

  async function attachTranscript(orgId: string, meetingId: string, body: { transcript: string; summary?: string }) {
    if (!orgId || !meetingId) throw new Error('Missing orgId or meetingId')
    const updated = await apiPost(`/api/orgs/${orgId}/meetings/${meetingId}/transcript`, body)
    upsert(updated)
    return updated
  }

  async function previewTranscript(orgId: string, meetingId: string, body: { transcript: string; summary?: string }) {
    if (!orgId || !meetingId) throw new Error('Missing orgId or meetingId')
    const res = await apiPost(`/api/orgs/${orgId}/meetings/${meetingId}/transcript?dryRun=true`, body)
    return Array.isArray(res?.tasks) ? res.tasks : []
  }

  function getById(meetingId: string) {
    return meetings.value.find((m) => m.id === meetingId) || null
  }

  function clear() {
    meetings.value = []
  }

  return {
    meetings,
    loading,
    ingesting,
    load,
    ingest,
    attachTranscript,
    previewTranscript,
    getById,
    clear,
  }
})
