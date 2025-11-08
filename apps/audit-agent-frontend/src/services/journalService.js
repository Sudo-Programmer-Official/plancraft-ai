import api from '@/services/api'

export async function analyzeJournalEntry(text) {
  if (!text || !String(text).trim()) return null
  const { data } = await api.post('/journal/analyze', { text })
  return data?.analysis || null
}

export async function saveJournalEntry(payload) {
  if (!payload || !payload.text) {
    throw new Error('Missing journal text')
  }
  const form = new FormData()
  const meta = {
    text: payload.text,
    rawText: payload.rawText || payload.text,
    category: payload.category,
    categoryEmoji: payload.categoryEmoji,
    sentiment: payload.sentiment,
    mood: payload.mood,
    tone: payload.tone,
    keywords: payload.keywords || [],
    summary: payload.summary || '',
    takeaway: payload.takeaway || '',
    action: payload.action || '',
    date: payload.date || null,
    audioDurationMs: payload.audioDurationMs || null,
    wordCount: payload.wordCount || null,
  }
  form.append('meta', JSON.stringify(meta))
  if (payload.audioBlob instanceof Blob) {
    const filename = payload.audioFilename || `journal-${Date.now()}.webm`
    form.append('audio', payload.audioBlob, filename)
  }
  const { data } = await api.post('/journal/entries', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data?.entry || null
}

export async function fetchJournalInsights(params = {}) {
  const { data } = await api.get('/journal/insights', { params })
  return data?.insights || null
}
