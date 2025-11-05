// services/time_parser.js
// Normalizes AI temporal outputs and flags low-confidence entries that need
// refinement via extractReminderTime or fallback logic.

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const CONFIDENCE_THRESHOLD = 0.7

function safeConsoleLog(message, payload) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[TimeBrain][Parser] ${message}`, payload)
  } catch {
    /* noop */
  }
}

function normalizeGapMinutes(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return null
  return Math.round(num)
}

function normalizeRelation(value) {
  if (!value) return null
  const normalized = String(value).toLowerCase().trim()
  if (!normalized) return null
  if (['after', 'after_previous', 'after-previous'].includes(normalized)) return 'after_previous'
  if (['before', 'before_next', 'before-next'].includes(normalized)) return 'before_next'
  if (['same_time', 'same_time_previous', 'same-time-previous'].includes(normalized)) return 'same_time_previous'
  return normalized
}

function normalizeTimeHint(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeConfidence(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 1
  if (num < 0) return 0
  if (num > 1) return 1
  return Number(num.toFixed(2))
}

function normalizeLocalTime(value, tz) {
  if (!value) return null
  try {
    const parsed = dayjs(value).tz(tz)
    if (!parsed.isValid()) return null
    return parsed.format('YYYY-MM-DDTHH:mm:ssZ')
  } catch {
    return null
  }
}

function deriveFallbackIso(planDate, tz, hour = 9, minute = 0) {
  try {
    const date = dayjs.tz(`${planDate}T00:00:00`, tz).hour(hour).minute(minute).second(0)
    return date.format('YYYY-MM-DDTHH:mm:ssZ')
  } catch {
    return null
  }
}

function buildRefinementQuestion(task, context) {
  const base = [
    `We interpret the task "${task.title}" as happening ${task.timeHint || 'soon'}.`,
  ]
  if (context?.plan_date) base.push(`Planning date: ${context.plan_date}.`)
  if (context?.last_task_end) {
    base.push(`The previous task ends at ${context.last_task_end}.`)
  }
  base.push('Does this imply a specific local time today? Provide an ISO timestamp.')
  return base.join(' ')
}

/**
 * Normalize the AI response into predictable task objects.
 * @param {Array<Object>} rawItems - AI-produced tasks
 * @param {Object} context - Output from buildTimeContext().context
 * @returns {{ tasks: Array<Object>, revalidation: Array<Object> }}
 */
export function normalizeTemporalTasks(rawItems = [], context = {}) {
  const timezoneId = context?.timezone || 'UTC'
  const planDate = context?.plan_date
  const normalized = []
  const revalidation = []

  rawItems.forEach((item, index) => {
    if (!item) return
    const title = String(item.title || item.name || '').trim()
    if (!title) return

    const parsedLocal = normalizeLocalTime(
      item.parsedTimeLocal || item.parsed_time_local || item.scheduledTime || item.scheduled_time,
      timezoneId
    )
    const gapMinutes = normalizeGapMinutes(item.gapMinutes ?? item.gap_minutes)
    const relation = normalizeRelation(item.relation ?? item.timeRelation ?? item.time_relation)
    const timeHint = normalizeTimeHint(item.timeHint ?? item.time_hint ?? item.hint)
    const confidence = normalizeConfidence(item.confidence ?? item.score ?? item.certainty)
    const displayTitle = typeof item.displayTitle === 'string' && item.displayTitle.trim()
      ? item.displayTitle.trim()
      : null
    const rawPhrase = typeof item.rawPhrase === 'string' && item.rawPhrase.trim()
      ? item.rawPhrase.trim()
      : null
    const category = typeof item.category === 'string' && item.category.trim()
      ? item.category.trim()
      : 'Uncategorized'

    const task = {
      title,
      displayTitle,
      rawPhrase,
      details: item.details ?? '',
      link: item.link ?? '',
      timeHint,
      relation,
      gapMinutes,
      confidence,
      parsedTimeLocal: parsedLocal,
      sourceIndex: index,
      category,
      meta: {
        original: item,
        reason: null,
      },
    }

    if (!task.parsedTimeLocal && planDate) {
      task.parsedTimeLocal = deriveFallbackIso(planDate, timezoneId)
      task.meta.reason = 'fallback_plan_date_anchor'
    }

    normalized.push(task)

    if (confidence < CONFIDENCE_THRESHOLD || !parsedLocal) {
      revalidation.push({
        task,
        question: buildRefinementQuestion(task, context),
      })
    }
  })

  safeConsoleLog('Normalized temporal tasks', {
    count: normalized.length,
    recheck: revalidation.length,
  })

  return { tasks: normalized, revalidation }
}

export function shouldRevalidate(task) {
  return !task?.parsedTimeLocal || Number(task?.confidence ?? 1) < CONFIDENCE_THRESHOLD
}

export function buildRefinementQuery(task, context) {
  if (!task) return null
  return buildRefinementQuestion(task, context)
}
