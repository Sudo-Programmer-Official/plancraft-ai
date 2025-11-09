// services/time_context.js
// Builds a rich temporal context payload that can be fed into AI prompts
// and reused across the scheduling pipeline.

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { toLocalDateKey } from '@/utils/dateHelper'
import { getUserTimezone } from '@/utils/time'

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_ACTIVE_HOURS = Object.freeze({ start: 8, end: 22 }) // 8 AM → 10 PM
const DEFAULT_PATTERN = 'balanced'

function safeConsoleLog(message, payload) {
  try {
     
    console.log(`[TimeBrain][Context] ${message}`, payload)
  } catch {
    /* no-op */
  }
}

function resolveTimezone(explicitTz) {
  const inferred = explicitTz || getUserTimezone()
  if (inferred && typeof inferred === 'string' && inferred.includes('/')) return inferred
  try {
    const intlGuess = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (intlGuess) return intlGuess
  } catch {
    /* ignore */
  }
  return 'UTC'
}

function normalizeDateInput(value, tz) {
  if (!value) return toLocalDateKey(new Date())
  if (value instanceof Date) return toLocalDateKey(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  try {
    return dayjs(value).tz(tz).format('YYYY-MM-DD')
  } catch {
    return toLocalDateKey(new Date())
  }
}

function normalizeDateTime(value, tz) {
  if (!value) return null
  try {
    const d = dayjs(value).tz(tz)
    if (!d.isValid()) return null
    return d.format('YYYY-MM-DDTHH:mm:ssZ')
  } catch {
    return null
  }
}

function deriveUserPattern(preferences = {}) {
  if (!preferences) return DEFAULT_PATTERN
  const pattern =
    preferences?.timePattern ||
    preferences?.temporalPattern ||
    preferences?.userPattern ||
    null
  if (pattern && typeof pattern === 'string') return pattern

  const morningRatio = preferences?.morning_task_ratio
  if (typeof morningRatio === 'number') {
    if (morningRatio > 0.65) return 'morning-heavy'
    if (morningRatio < 0.35) return 'evening-heavy'
    return 'balanced'
  }
  return DEFAULT_PATTERN
}

function deriveActiveHours(preferences = {}) {
  const start =
    Number(preferences?.activeHours?.start_hour ?? preferences?.active_start_hour)
  const end =
    Number(preferences?.activeHours?.end_hour ?? preferences?.active_end_hour)
  const validStart = Number.isFinite(start) && start >= 0 && start <= 23 ? start : null
  const validEnd = Number.isFinite(end) && end >= 0 && end <= 23 ? end : null
  return {
    start: validStart ?? DEFAULT_ACTIVE_HOURS.start,
    end: validEnd ?? DEFAULT_ACTIVE_HOURS.end,
  }
}

/**
 * Build a temporal context payload ready to be serialized for prompts.
 *
 * @param {Object} options
 * @param {string|Date} options.planDate - Target planning date (local)
 * @param {string} [options.timezone] - IANA timezone; autodetected if missing
 * @param {Date|string} [options.now] - Current anchor; defaults to now()
 * @param {Date|string} [options.lastTaskEnd] - Previous task end in local time
 * @param {Object} [options.userPreferences] - Preference snapshot (active hours, patterns, etc.)
 * @param {Object} [options.memorySnapshot] - Aggregated temporal memory stats
 * @param {Array<Object>} [options.existingTasks] - Already scheduled tasks (optional)
 * @returns {{ context: Object, serialized: string }}
 */
export function buildTimeContext(options = {}) {
  const {
    planDate,
    timezone: tzHint,
    now,
    lastTaskEnd,
    userPreferences = {},
    memorySnapshot = {},
    existingTasks = [],
  } = options

  const timezoneId = resolveTimezone(tzHint)
  const nowAnchor = normalizeDateTime(now || new Date(), timezoneId)
  const normalizedPlanDate = normalizeDateInput(planDate, timezoneId)
  const normalizedLastTask = normalizeDateTime(lastTaskEnd, timezoneId)
  const activeHours = deriveActiveHours(userPreferences)
  const userPattern = deriveUserPattern({
    ...userPreferences,
    ...memorySnapshot?.summary,
  })

  const priorTaskCount = Array.isArray(existingTasks) ? existingTasks.length : 0
  const lastTaskSummary = existingTasks && existingTasks.length
    ? existingTasks[existingTasks.length - 1]
    : null

  const context = {
    now: nowAnchor,
    plan_date: normalizedPlanDate,
    timezone: timezoneId,
    last_task_end: normalizedLastTask,
    active_hours: activeHours,
    user_pattern: userPattern,
    prior_tasks: priorTaskCount,
    last_task_summary: lastTaskSummary
      ? {
          title: lastTaskSummary.title,
          ends_at: normalizeDateTime(lastTaskSummary.ends_at || lastTaskSummary.reminderTime, timezoneId),
        }
      : null,
    memory_bias: memorySnapshot?.bias ?? null,
  }

  const serialized = JSON.stringify(context, null, 2)
  safeConsoleLog('Built temporal context', context)
  return { context, serialized }
}

/**
 * Lightweight helper to append context metadata into an API payload.
 */
export function attachTimeContext(payload = {}, contextBundle) {
  if (!contextBundle?.context) return payload
  return {
    ...payload,
    timeContext: contextBundle.context,
  }
}
