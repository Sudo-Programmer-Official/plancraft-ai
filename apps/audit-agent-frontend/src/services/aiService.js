// src/services/aiService.js
// Use the shared API client so auth headers (Firebase/X-App-Token) are attached
import api from '@/services/api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

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
export async function generateTasksFromText(text) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const res = await api.post("/split-tasks", { text, timezone: tz });
    const raw = Array.isArray(res?.data?.tasks) ? res.data.tasks : []
    const reminderTime = res?.data?.reminderTime ?? null

    const items = raw
      .map((entry) => {
        if (typeof entry === 'string') {
          const title = entry.trim()
          return title ? { title } : null
        }
        if (!entry || typeof entry !== 'object') return null
        const title = String(entry.title || entry.name || '').trim()
        if (!title) return null
        const normalizeNumber = (value) => {
          const num = Number(value)
          return Number.isFinite(num) && num > 0 ? num : undefined
        }
        return {
          title,
          details: entry.details ?? '',
          link: entry.link ?? '',
          estimate_minutes: normalizeNumber(entry.estimate_minutes ?? entry.estimateMinutes ?? entry.duration ?? entry.durationMinutes),
          time: entry.time ?? null,
          scheduledTime: entry.scheduledTime ?? entry.scheduled_time ?? null,
          relation: entry.relation ?? entry.timeRelation ?? null,
          gapMinutes: normalizeNumber(entry.gapMinutes ?? entry.gap_minutes),
          timeHint: entry.timeHint ?? entry.time_hint ?? null,
        }
      })
      .filter(Boolean)

    const tasks = items.map((t) => t.title).filter(Boolean)
    return { tasks, items, reminderTime }
  } catch (err) {
    console.error("❌ Generate Tasks API Error:", err?.response?.data || err.message);
    throw new Error("Failed to generate tasks. Please try again later.");
  }
}

/**
 * ✨ Extract reminder time (ISO) from freeform text
 */
export async function extractReminderTime(text, { now, timezone: tz } = {}) {
  try {
    const timezoneGuess = tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const anchor = now
      ? now
      : dayjs().tz(timezoneGuess).format('YYYY-MM-DDTHH:mm:ssZ')
    const payload = { text, timezone: timezoneGuess, now: anchor }
    const res = await api.post("/extract-time", payload);
    const iso = res?.data?.reminderTime
    const normalized = typeof iso === 'string' && iso ? iso : null
    try {
      console.log('[TimeFlow] frontend extractReminderTime', { text, now: anchor, timezone: timezoneGuess, iso: normalized })
    } catch {}
    return normalized
  } catch (err) {
    console.error("❌ Extract Time API Error:", err?.response?.data || err.message);
    return null
  }
}
