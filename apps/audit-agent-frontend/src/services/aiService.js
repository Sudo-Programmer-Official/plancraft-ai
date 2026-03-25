// src/services/aiService.js
// Use the shared API client so auth headers (Firebase/X-App-Token) are attached
import api from '@/services/api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { ElMessage } from 'element-plus'
import { buildTimeContext } from '@/services/time_context'
import { normalizeTemporalTasks } from '@/services/time_parser'
import { ensureAiConsentOrThrow } from '@/services/aiConsentService'

dayjs.extend(utc)
dayjs.extend(timezone)

const RELATIVE_UNIT_MAP = {
  minute: 'minute',
  minutes: 'minute',
  min: 'minute',
  mins: 'minute',
  m: 'minute',
  hour: 'hour',
  hours: 'hour',
  hr: 'hour',
  hrs: 'hour',
  h: 'hour',
  day: 'day',
  days: 'day',
  d: 'day',
}

// 🔹 Utility: safe response unwrap
function safeGet(res, key, fallback = null) {
  return res?.data?.[key] ?? fallback;
}

function logTimeBrain(event, payload) {
  try {
     
    console.log(`[TimeBrain][Service] ${event}`, payload)
  } catch {
    /* noop */
  }
}

const TOAST_DEBOUNCE_MS = 8000
let lastSummarizerWarningAt = 0

function emitSummarizerTimeoutWarning() {
  const now = Date.now()
  if (now - lastSummarizerWarningAt < TOAST_DEBOUNCE_MS) return
  lastSummarizerWarningAt = now
  try {
    ElMessage.warning('AI summarizer took too long. Try a shorter selection.')
  } catch {}
}

/**
 * ✨ Journal Enhancer
 */
export async function enhanceJournal(text) {
  await ensureAiConsentOrThrow({ source: 'journal-enhance' })
  try {
    const res = await api.post("/journal/enhance", { text });
    return safeGet(res, "enhanced", "");
  } catch (err) {
    if (err?.code === 'AI_CONSENT_REQUIRED') throw err
    console.error("❌ Journal Enhance API Error:", err?.response?.data || err.message);
    throw new Error("Failed to enhance journal entry. Please try again later.");
  }
}

/**
 * ✨ Task Summarizer
 */
export async function summarizeTasks(tasks) {
  await ensureAiConsentOrThrow({ source: 'tasks-summarize' })
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
    if (err?.code === 'AI_CONSENT_REQUIRED') throw err
    const msg = err?.response?.data || err?.message
    console.error("❌ Task Summarize API Error:", msg);
    if (err?.code === 'ECONNABORTED' || /timeout/i.test(String(msg))) {
      emitSummarizerTimeoutWarning()
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
  await ensureAiConsentOrThrow({ source: 'tasks-generate' })
  const trimmed = String(text ?? '').trim()
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
    attachments,
    workspaceId,
    reminderTime,
  } = options

  const sanitizedAttachments = Array.isArray(attachments)
    ? attachments
        .map((att) => ({
          type: att?.type || 'image',
          url: att?.url,
          mime: att?.mime,
        }))
        .filter((att) => att.url)
    : []

  if (!trimmed && !sanitizedAttachments.length) {
    return { tasks: [], items: [], reminderTime: null, revalidation: [], context: null, contextSerialized: null }
  }

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
    now: contextBundle.context.now,
  }
  if (planDate) payload.planDate = planDate
  if (workspaceId) payload.workspaceId = workspaceId
  if (reminderTime) payload.reminderTime = reminderTime
  if (sanitizedAttachments.length) payload.attachments = sanitizedAttachments

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
    if (err?.code === 'AI_CONSENT_REQUIRED') throw err
    console.error("❌ Generate Tasks API Error:", err?.response?.data || err.message);
    throw new Error("Failed to generate tasks. Please try again later.");
  }
}

/**
 * ✨ Extract reminder time (ISO) from freeform text
 */

function resolveRelativeReminderIso(text, nowAnchor, timezoneGuess) {
  if (!text) return null
  const normalized = String(text).toLowerCase()
  if (!/\bin\s+\d/.test(normalized)) return null

  const matches = Array.from(normalized.matchAll(/(\d+)\s*(minute|minutes|min|mins|m|hour|hours|hr|hrs|h|day|days|d)\b/g))
  if (!matches.length) return null

  const base = (() => {
    try {
      if (nowAnchor) {
        const candidate = dayjs(nowAnchor)
        if (candidate.isValid()) return candidate.tz(timezoneGuess)
      }
    } catch {}
    return dayjs().tz(timezoneGuess)
  })()
  if (!base || !base.isValid()) return null

  let candidate = base
  matches.forEach((match) => {
    const amount = Number.parseInt(match[1], 10)
    const unitToken = match[2]
    const unit = RELATIVE_UNIT_MAP[unitToken] || 'minute'
    if (Number.isFinite(amount) && amount > 0) {
      candidate = candidate.add(amount, unit)
    }
  })

  if (!candidate.isValid() || candidate.isSame(base)) return null
  if (candidate.isBefore(base)) {
    candidate = candidate.add(1, 'minute')
  }
  return candidate.utc().toISOString()
}

export async function extractReminderTime(text, options = {}) {
  await ensureAiConsentOrThrow({ source: 'reminder-extract' })
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

  const relativeIso = resolveRelativeReminderIso(trimmed, nowAnchor, timezoneGuess)
  if (relativeIso) {
    logTimeBrain('extractReminderTime:relative-hit', {
      label: debugLabel,
      timezone: timezoneGuess,
      now: nowAnchor,
      iso: relativeIso,
    })
    return relativeIso
  }

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
    if (err?.code === 'AI_CONSENT_REQUIRED') throw err
    console.error("❌ Extract Time API Error:", err?.response?.data || err.message);
    return null
  }
}
