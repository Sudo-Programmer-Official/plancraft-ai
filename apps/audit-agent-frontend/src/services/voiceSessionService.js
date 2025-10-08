// src/services/voiceSessionService.js
import api from '@/services/api'
import { toUTC } from '@/utils/timezone'

// Handle a single voice session transcript: parse into multiple reminders
// and schedule each using the existing reminder API.
// Returns the array of parsed reminders that were submitted.
export async function handleVoiceSession(transcript, userId, channels = ['whatsapp']) {
  if (!userId) throw new Error('Missing userId')
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const res = await api.post('/parse-reminders', { transcript, userId })
  const reminders = Array.isArray(res?.data) ? res.data : []

  for (const r of reminders) {
    const utcTime = toUTC(r.time, tz) || r.time
    const payload = {
      userId,
      text: r.task,
      scheduledTime: utcTime,
      channels,
      timezone: tz,
    }
    await api.post('/reminders/text', payload)
  }

  return reminders
}
