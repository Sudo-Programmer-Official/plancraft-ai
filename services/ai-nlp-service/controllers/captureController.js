import { runLlmWithImage } from '../services/visionClient.js'

/**
 * Simple image ingest:
 * Body: { image: dataUrl/base64, workspaceId?, source? }
 * Returns: { items: [{ title, description, type, confidence }], ocrText }
 */
export async function ingestImage(req, res, next) {
  try {
    const image = req.body?.image || ''
    if (!image) return res.status(400).json({ success: false, error: 'image is required' })

    const prompt = [
      'You are extracting tasks/events from a handwritten or photo capture.',
      'Return a JSON array of items with shape:',
      '{ "title": string, "description": string, "type": "task" | "event", "confidence": number }',
      'Keep titles short. Use type "event" only if a clear date/time/meeting is present; otherwise use "task".',
    ].join('\n')

    const { text } = await runLlmWithImage(prompt, image)
    let items = []
    try {
      const start = text.indexOf('[')
      const end = text.lastIndexOf(']')
      const slice = start !== -1 && end !== -1 ? text.slice(start, end + 1) : text
      const parsed = JSON.parse(slice)
      if (Array.isArray(parsed)) items = parsed
    } catch {
      // fallback: split lines into tasks
      items = text
        .split('\n')
        .map((line) => line.replace(/^[\-\*\d\.\s]+/, '').trim())
        .filter(Boolean)
        .map((line) => ({ title: line, description: '', type: 'task', confidence: 0.5 }))
    }

    res.json({
      success: true,
      ocrText: text,
      items: items.map((it) => ({
        title: it.title || it.text || 'Untitled',
        description: it.description || '',
        type: it.type === 'event' ? 'event' : 'task',
        confidence: typeof it.confidence === 'number' ? it.confidence : 0.5,
      })),
    })
  } catch (err) {
    next(err)
  }
}
