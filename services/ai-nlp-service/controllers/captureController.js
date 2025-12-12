import { runLlmWithImage } from '../services/visionClient.js'

/**
 * Image ingest with structured extraction for tasks, events, or occasions.
 * Body: { image: dataUrl/base64, workspaceId?, source?, mode? }
 * mode: "tasks" | "event" | "occasion" | "auto" (default auto)
 *
 * Returns:
 * {
 *   rawText,
 *   tasks: [{ title, description, dueDate, confidence }],
 *   event: { title, date, startTime, endTime, timezone, locationText, notes, confidence } | null,
 *   occasion: { name, type, date, dateConfidence, relationshipHint, locationText, messageHint, confidence } | null,
 *   items: [{ title, description, type, confidence }] // backward compatibility
 * }
 */
export async function ingestImage(req, res, next) {
  try {
    const image = req.body?.image || ''
    if (!image) return res.status(400).json({ success: false, error: 'image is required' })
    const mode = (req.query?.mode || req.body?.mode || 'auto').toString().toLowerCase()

    const prompt = [
      'You are extracting structured data from a photo/scan (handwritten or printed).',
      'Always respond with a single JSON object with keys: rawText, tasks, event, occasion.',
      'Schema:',
      '{',
      '  "rawText": string,',
      '  "tasks": [ { "title": string, "description": string|null, "dueDate": string|null, "confidence": number } ],',
      '  "event": {',
      '    "title": string|null,',
      '    "date": "YYYY-MM-DD" | null,',
      '    "startTime": "HH:mm" | null,',
      '    "endTime": "HH:mm" | null,',
      '    "timezone": string|null,',
      '    "locationText": string|null,',
      '    "notes": string|null,',
      '    "confidence": number',
      '  } | null,',
      '  "occasion": {',
      '    "name": string|null,',
      '    "type": "birthday"|"anniversary"|"wedding"|"festival"|"graduation"|"milestone"|string|null,',
      '    "date": "YYYY-MM-DD" | null,',
      '    "dateConfidence": number,',
      '    "relationshipHint": string|null,',
      '    "locationText": string|null,',
      '    "messageHint": string|null,',
      '    "confidence": number',
      '  } | null',
      '}',
      '',
      'Rules:',
      '- Keep confidence between 0 and 1.',
      '- If unsure, return null for date/time/location.',
      '- Dates must be ISO (YYYY-MM-DD). Times must be 24h HH:mm.',
      '- If multiple dates/times appear, pick the most likely start.',
      '- locationText should be one clean string (venue, city, address).',
      '- rawText is the OCR text you saw.',
    ]

    if (mode === 'event') {
      prompt.push('Focus on extracting the event object; tasks/occasion can be empty.')
    } else if (mode === 'occasion') {
      prompt.push('Focus on extracting the occasion object (names, type, date); tasks/event can be empty.')
    } else if (mode === 'tasks') {
      prompt.push('Focus on extracting tasks; event/occasion can be null.')
    } else {
      prompt.push('Auto-detect whether content is tasks, an event, or an occasion; fill what is relevant.')
    }

    const { text } = await runLlmWithImage(prompt.join('\n'), image)
    let parsed = {}
    try {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      const slice = start !== -1 && end !== -1 ? text.slice(start, end + 1) : text
      parsed = JSON.parse(slice)
    } catch {
      parsed = {}
    }

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.map((t) => ({
          title: (t.title || t.text || '').toString().trim() || 'Untitled',
          description: (t.description || '').toString().trim(),
          dueDate: t.dueDate || null,
          confidence: typeof t.confidence === 'number' ? t.confidence : 0.5,
        }))
      : []

    const event = parsed.event
      ? {
          title: (parsed.event.title || '').toString().trim() || null,
          date: parsed.event.date || null,
          startTime: parsed.event.startTime || null,
          endTime: parsed.event.endTime || null,
          timezone: parsed.event.timezone || null,
          locationText: parsed.event.locationText || null,
          notes: parsed.event.notes || '',
          confidence: typeof parsed.event.confidence === 'number' ? parsed.event.confidence : 0.5,
        }
      : null

    const occasion = parsed.occasion
      ? {
          name: parsed.occasion.name || null,
          type: parsed.occasion.type || null,
          date: parsed.occasion.date || null,
          dateConfidence:
            typeof parsed.occasion.dateConfidence === 'number' ? parsed.occasion.dateConfidence : 0.5,
          relationshipHint: parsed.occasion.relationshipHint || null,
          locationText: parsed.occasion.locationText || null,
          messageHint: parsed.occasion.messageHint || null,
          confidence: typeof parsed.occasion.confidence === 'number' ? parsed.occasion.confidence : 0.5,
        }
      : null

    // Backward-compatible items list (used by Journal scan UI)
    const items = tasks.map((t) => ({
      title: t.title,
      description: t.description,
      type: 'task',
      confidence: t.confidence,
    }))
    if (event?.title) {
      items.push({
        title: event.title,
        description: event.notes || '',
        type: 'event',
        confidence: event.confidence,
      })
    }

    // Fallback: if no parsed data, try simple line split to produce tasks
    if (!tasks.length && !event && !occasion) {
      const fallback = (text || '')
        .split('\n')
        .map((line) => line.replace(/^[\-\*\d\.\s]+/, '').trim())
        .filter(Boolean)
      fallback.forEach((line) =>
        items.push({ title: line, description: '', type: 'task', confidence: 0.5 }),
      )
    }

    res.json({
      success: true,
      rawText: text,
      tasks,
      event,
      occasion,
      items,
    })
  } catch (err) {
    next(err)
  }
}
