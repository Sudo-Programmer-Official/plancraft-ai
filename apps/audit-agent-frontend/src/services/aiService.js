// src/services/aiService.js
// Use the shared API client so auth headers (Firebase/X-App-Token) are attached
import api from '@/services/api'

// 🔹 Utility: safe response unwrap
function safeGet(res, key, fallback = null) {
  return res?.data?.[key] ?? fallback;
}

/**
 * ✨ Journal Enhancer
 */
export async function enhanceJournal(text) {
  try {
    const res = await api.post("/journal/enhance", { text });
    return safeGet(res, "enhanced", "");
  } catch (err) {
    console.error("❌ Journal Enhance API Error:", err?.response?.data || err.message);
    throw new Error("Failed to enhance journal entry. Please try again later.");
  }
}

/**
 * ✨ Task Summarizer
 */
export async function summarizeTasks(tasks) {
  try {
    const res = await api.post("/tasks/summarize", { tasks });

    // Normalize keys for frontend (camelCase)
    const summary = res.data?.summary || {};

    return {
      completedPct: summary["Completed %"] ?? summary.completedPct ?? 0,
      pending: summary["Pending items"] ?? summary.pending ?? 0,
      focus: summary["Suggested focus for today"] ?? summary.focus ?? "",
      quickWins: summary["Quick wins"] ?? summary.quickWins ?? [],
      heavyLifts: summary["Heavy lifts"] ?? summary.heavyLifts ?? [],
      weeklyWarning: summary["Weekly warning"] ?? summary.weeklyWarning ?? "",
    };
  } catch (err) {
    console.error("❌ Task Summarize API Error:", err?.response?.data || err.message);
    return {
      completedPct: 0,
      pending: 0,
      focus: "",
      quickWins: [],
      heavyLifts: [],
      weeklyWarning: "",
    };
  }
}

/**
 * ✨ Generate tasks from freeform text
 */
export async function generateTasksFromText(text, options = {}) {
  // Local fallback parser (simple regex) -- quick offline handling
  function normalizeTime(raw) {
    if (!raw) return null
    // normalize separators like 6.45 or 6:45 or 18:45 or 745
    const cleaned = String(raw).replace('.', ':').replace(/\s+/g, '')
    const m = cleaned.match(/^(\d{1,2})(:?)(\d{2})?$/)
    if (!m) return null
    let h = parseInt(m[1], 10)
    const mm = m[3] ? parseInt(m[3], 10) : 0
    // If hour < 6, assume evening context (user texts often omit AM/PM)
    if (h < 6) h += 12
    h = Math.max(0, Math.min(23, h))
    const minutes = Math.max(0, Math.min(59, mm || 0))
    return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  function extractTasksFromText(freeText) {
    const regex = /([A-Za-z0-9'’\-\s]+?)\s+(?:at|around|around\s+about|by)\s+(\d{1,2}(?::|\.)?\d{0,2})/gi
    const results = []
    let match
    while ((match = regex.exec(freeText)) !== null) {
      const title = match[1].trim()
      const timeStr = match[2]
      const value = normalizeTime(timeStr)
      results.push({ title: title || freeText.trim(), time: { type: 'absolute', value } })
    }
    // If nothing extracted, also attempt splitting by commas and looking for time-like tokens
    if (!results.length) {
      const parts = freeText.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean)
      for (const p of parts) {
        const tmatch = p.match(/(\d{1,2}(?::|\.)?\d{0,2})/)
        if (tmatch) {
          const title = p.replace(tmatch[0], '').trim() || p
          results.push({ title, time: { type: 'absolute', value: normalizeTime(tmatch[0]) } })
        }
      }
    }
    return results
  }

  try {
    const tz = options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const res = await api.post('/split-tasks', { text, timezone: tz })
    console.log('AI raw result:', res?.data)

    const reminderTime = res?.data?.reminderTime ?? null

    let raw = res?.data?.tasks ?? res?.data ?? null

    // If the backend already returned structured objects, normalize them
    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
      const tasks = raw.map((t) => {
        const title = (t?.title || t?.text || t?.name || '').trim()
        const timeObj = t?.time || (t?.scheduledTime ? { type: 'absolute', value: (t.scheduledTime || null) } : null)
        // If timeObj is an ISO string, convert to HH:mm (try) or keep scheduledTime
        return {
          title: title || '',
          details: t?.details || '',
          estimate_minutes: t?.estimate_minutes || t?.estimate || null,
          time: timeObj ? (timeObj.type ? timeObj : { type: 'absolute', value: timeObj }) : { type: 'derived', value: null },
          scheduledTime: t?.scheduledTime || null
        }
      }).filter(t => t.title)

      if (tasks.length) return { tasks, reminderTime, timeRelations: res?.data?.timeRelations || [] }
    }

    // If backend returned an array of strings, or a single blob, try to parse
    let tasks = []
    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'string') {
      // Join into one text blob and attempt extraction
      const joined = raw.join('. ')
      tasks = extractTasksFromText(joined)
      if (!tasks.length) tasks = raw.map(r => ({ title: r.trim(), time: { type: 'derived', value: null } }))
    } else if (typeof raw === 'string') {
      tasks = extractTasksFromText(raw)
      if (!tasks.length) {
        // fallback: split by commas
        const parts = raw.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean)
        tasks = parts.map(p => ({ title: p, time: { type: 'derived', value: null } }))
      }
    }

    // Final normalization: ensure title and estimate
    tasks = tasks.map(t => ({
      title: (t.title || '').trim(),
      details: t.details || '',
      estimate_minutes: t.estimate_minutes || 30,
      time: t.time || { type: 'derived', value: null },
      scheduledTime: t.scheduledTime || (t.time?.value ? null : null)
    }))

    if (!tasks.length) {
      // ultimate fallback: return the whole text as a single derived task
      tasks = [{ title: String(text).trim(), details: '', estimate_minutes: 30, time: { type: 'derived', value: null } }]
    }

    return { tasks, reminderTime }
  } catch (err) {
    console.error('❌ Generate Tasks API Error:', err?.response?.data || err.message)
    // Offline fallback when API fails
    const fallback = extractTasksFromText(text)
    if (fallback.length) return { tasks: fallback, reminderTime: null }
    return { tasks: [{ title: String(text).trim(), details: '', estimate_minutes: 30, time: { type: 'derived', value: null } }], reminderTime: null }
  }
}

/**
 * ✨ Extract reminder time (ISO) from freeform text
 */
export async function extractReminderTime(text) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const res = await api.post("/extract-time", { text, timezone: tz });
    const iso = res?.data?.reminderTime
    return typeof iso === 'string' && iso ? iso : null
  } catch (err) {
    console.error("❌ Extract Time API Error:", err?.response?.data || err.message);
    return null
  }
}
