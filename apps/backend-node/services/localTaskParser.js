import * as chrono from "chrono-node"
import dayjs from "../utils/dayjs.js"

const ACTION_VERBS = [
  "apply", "ask", "book", "buy", "call", "cancel", "check", "clean", "complete",
  "create", "email", "finish", "fix", "follow", "go", "join", "learn", "message",
  "organize", "pay", "plan", "prepare", "read", "review", "schedule", "send", "study",
  "submit", "text", "update", "work", "write", "workout",
]

const COMMAND_PREFIX = /^(?:(?:please\s+)?(?:remind|remember)(?:\s+me)?\s+to\s+|(?:please|can you|could you)\s+|(?:i|we)\s+(?:need|have|want)\s+to\s+|don't\s+forget\s+to\s+|task:\s*)/i
const DATE_WORDS = /\b(?:today|tomorrow|tonight|tonight|this\s+(?:morning|afternoon|evening|week)|next\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i
const COMPLEX_REQUEST = /\b(?:split|break\s+down|across\s+the\s+next|prioritize|step[- ]by[- ]step|several|multiple|each\s+(?:day|evening|morning))\b/i

function cleanWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/\s+([,.!?])/g, "$1").trim()
}

function stripCommandPrefix(value) {
  return cleanWhitespace(value).replace(COMMAND_PREFIX, "").trim()
}

function startsWithAction(value) {
  const firstWord = cleanWhitespace(value).toLowerCase().split(/\s+/)[0]
  return ACTION_VERBS.includes(firstWord)
}

function hasMultipleActions(value) {
  const lower = cleanWhitespace(value).toLowerCase()
  if (/\b(?:and then|then|also|after that|first|second|lastly)\b/.test(lower)) return true

  const actionMatches = ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(lower))
  return /\band\b/.test(lower) && actionMatches.length > 1
}

function chronoReference(now, timezone) {
  const localNow = dayjs(now || new Date()).tz(timezone || "UTC")
  // Chrono treats the Date object as local calendar data. Build a UTC Date whose
  // components match the user's local clock so relative dates stay in their zone.
  return new Date(Date.UTC(
    localNow.year(),
    localNow.month(),
    localNow.date(),
    localNow.hour(),
    localNow.minute(),
    localNow.second(),
  ))
}

function componentValue(component, name) {
  try {
    return component.get(name)
  } catch {
    return undefined
  }
}

function componentIsCertain(component, name) {
  try {
    return component.isCertain(name)
  } catch {
    return false
  }
}

function parseSchedule(input, { timezone, now }) {
  const reference = chronoReference(now, timezone)
  const parsed = chrono.parse(input, reference, { forwardDate: true })?.[0]
  if (!parsed) return null

  const start = parsed.start
  const referenceLocal = dayjs(now || new Date()).tz(timezone || "UTC")
  const hasDate = ["year", "month", "day"].some((field) => componentIsCertain(start, field)) || DATE_WORDS.test(parsed.text)
  const hasTime = componentIsCertain(start, "hour") || componentIsCertain(start, "minute")
  if (!hasDate && !hasTime) return null

  const year = componentValue(start, "year") ?? referenceLocal.year()
  const month = componentValue(start, "month") ?? referenceLocal.month() + 1
  const day = componentValue(start, "day") ?? referenceLocal.date()
  const hour = componentValue(start, "hour") ?? 9
  const minute = componentValue(start, "minute") ?? 0
  const localValue = dayjs.tz(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    timezone || "UTC",
  )

  if (!localValue.isValid()) return null

  return {
    text: parsed.text,
    date: localValue.format("YYYY-MM-DD"),
    scheduledTime: hasTime ? localValue.format("YYYY-MM-DDTHH:mm:ssZ") : null,
    reminderTime: hasTime ? localValue.utc().toISOString() : null,
  }
}

function taskFromTitle(title, original, schedule, source = "local", confidence = 0.95) {
  return {
    title,
    displayTitle: title,
    rawPhrase: original,
    details: null,
    estimate_minutes: null,
    energy: null,
    context: null,
    priority: 2,
    scheduledTime: schedule?.scheduledTime || null,
    date: schedule?.date || null,
    timeHint: schedule?.text || null,
    relation: null,
    gapMinutes: null,
    source,
    confidence,
  }
}

export function parseTaskLocally(input, { timezone = "UTC", now = null, maxItems = 6 } = {}) {
  const original = cleanWhitespace(input)
  const stripped = stripCommandPrefix(original)

  if (!stripped || !startsWithAction(stripped) || hasMultipleActions(stripped) || COMPLEX_REQUEST.test(stripped)) {
    return { confident: false, tasks: [], reminderTime: null }
  }

  const schedule = parseSchedule(stripped, { timezone, now })
  const title = cleanWhitespace(schedule ? stripped.replace(schedule.text, " ") : stripped).replace(/[,.!?]+$/, "")
  if (!title || title.split(/\s+/).length < 2) {
    return { confident: false, tasks: [], reminderTime: null }
  }

  return {
    confident: true,
    tasks: [taskFromTitle(title, original, schedule)].slice(0, Math.max(1, maxItems)),
    reminderTime: schedule?.reminderTime || null,
  }
}

export function buildSafeTaskFallback(input) {
  const original = cleanWhitespace(input)
  const title = stripCommandPrefix(original).slice(0, 180) || "New task"
  return {
    confident: true,
    tasks: [taskFromTitle(title, original, null, "local-safe-fallback", 0.25)],
    reminderTime: null,
  }
}
