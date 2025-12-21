import api from '@/services/api'

/**
 * Submit feedback with optional media.
 * Accepts plain object with fields and optional File/Blob for image and audio.
 */
export async function submitFeedback(payload = {}) {
  const form = new FormData()
  form.append('workingWell', payload.workingWell || '')
  if (payload.frustrating) form.append('frustrating', payload.frustrating)
  if (payload.name) form.append('name', payload.name)
  if (payload.email) form.append('email', payload.email)
  if (payload.company) form.append('company', payload.company)
  if (payload.teamSize) form.append('teamSize', payload.teamSize)
  if (payload.image instanceof File || payload.image instanceof Blob) {
    form.append('image', payload.image, payload.image.name || 'feedback-image')
  }
  if (payload.audio instanceof File || payload.audio instanceof Blob) {
    form.append('audio', payload.audio, payload.audio.name || 'feedback-audio.webm')
  }

  // Prefer public endpoint if available; fallback to private.
  try {
    const { data } = await api.post('/public/feedback', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  } catch (err) {
    const { data } = await api.post('/feedback', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }
}
