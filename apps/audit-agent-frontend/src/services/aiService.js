// src/services/aiService.js
// Use the shared API client so auth headers (Firebase/X-App-Token) are attached
import api from '@/services/api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { ElMessage } from 'element-plus'
import { buildTimeContext } from '@/services/time_context'
import { normalizeTemporalTasks } from '@/services/time_parser'

dayjs.extend(utc)
dayjs.extend(timezone)

// 🔹 Utility: safe response unwrap
function safeGet(res, key, fallback = null) {
  return res?.data?.[key] ?? fallback;
}

function logTimeBrain(event, payload) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[TimeBrain][Service] ${event}`, payload)
  } catch {
    /* noop */
  }
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
    const msg = err?.response?.data || err?.message
    console.error("❌ Task Summarize API Error:", msg);
    if (err?.code === 'ECONNABORTED' || /timeout/i.test(String(msg))) {
      try { ElMessage.warning('AI summarizer took too long. Try a shorter selection.'); } catch {}
    }
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
 * ✨ Generate tasks from freeform text with temporal context
 */
export async function generateTasksFromText(text, options = {}) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) {
    return { tasks: [], items: [], reminderTime: null, revalidation: [], context: null, contextSerialized: null }
  }

  const {
    planDate,
    timezone,
    now,
    lastTaskEnd,
    userPreferences,
    memorySnapshot,
    existingTasks,
    maxItems,
    debugLabel,
  } = options

  const contextBundle = buildTimeContext({
    planDate,
    timezone,
    now,
    lastTaskEnd,
    userPreferences,
    memorySnapshot,
    existingTasks,
  })

  const payload = {
    text: trimmed,
    timezone: contextBundle.context.timezone,
    context: contextBundle.serialized,
    maxItems: maxItems ?? 6,
    timeContext: contextBundle.context,
  }

  logTimeBrain('generateTasksFromText:request', {
    label: debugLabel,
    timezone: payload.timezone,
    planDate: contextBundle.context.plan_date,
  })

  try {
    const res = await api.post("/split-tasks", payload);
    const raw = Array.isArray(res?.data?.tasks) ? res.data.tasks : []
    const { tasks: normalized, revalidation } = normalizeTemporalTasks(raw, contextBundle.context)
    const reminderTime = res?.data?.reminderTime ?? null

    logTimeBrain('generateTasksFromText:response', {
      label: debugLabel,
      count: normalized.length,
      reminderTime,
      needsRecheck: revalidation.length,
    })

    return {
      tasks: normalized.map((t) => t.title).filter(Boolean),
      items: normalized,
      reminderTime,
      revalidation,
      context: contextBundle.context,
      contextSerialized: contextBundle.serialized,
      raw: raw,
    }
  } catch (err) {
    console.error("❌ Generate Tasks API Error:", err?.response?.data || err.message);
    throw new Error("Failed to generate tasks. Please try again later.");
  }
}

/**
 * ✨ Extract reminder time (ISO) from freeform text
 */
export async function extractReminderTime(text, options = {}) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return null

  const {
    now,
    timezone: tz,
    planDate,
    lastTaskEnd,
    userPreferences,
    memorySnapshot,
    existingTasks,
    contextBundle: providedContext,
    debugLabel,
  } = options

  const contextBundle = providedContext || buildTimeContext({
    planDate,
    timezone: tz,
    now,
    lastTaskEnd,
    userPreferences,
    memorySnapshot,
    existingTasks,
  })

  const timezoneGuess = tz || contextBundle.context.timezone || 'UTC'
  const nowAnchor = (() => {
    if (typeof now === 'string' && now) return now
    if (now instanceof Date) return dayjs(now).tz(timezoneGuess).format('YYYY-MM-DDTHH:mm:ssZ')
    return contextBundle.context.now || dayjs().tz(timezoneGuess).format('YYYY-MM-DDTHH:mm:ssZ')
  })()

  const payload = {
    text: trimmed,
    timezone: timezoneGuess,
    now: nowAnchor,
    context: contextBundle.serialized,
    timeContext: contextBundle.context,
  }

  logTimeBrain('extractReminderTime:request', {
    label: debugLabel,
    timezone: timezoneGuess,
    planDate: contextBundle.context.plan_date,
  })

  try {
    const res = await api.post("/extract-time", payload);
    const iso = res?.data?.reminderTime
    const normalized = typeof iso === 'string' && iso ? iso : null
    try {
      console.log('[TimeFlow] frontend extractReminderTime', { text: trimmed.slice(0, 80), now: nowAnchor, timezone: timezoneGuess, iso: normalized })
    } catch {}
    return normalized
  } catch (err) {
    console.error("❌ Extract Time API Error:", err?.response?.data || err.message);
    return null
  }
}
