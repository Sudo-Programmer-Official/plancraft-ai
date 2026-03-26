import dayjs from 'dayjs'

const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
}

const SIMPLE_NUMBER_WORDS = Object.keys(NUMBER_WORDS)
  .filter((key) => key !== 'hundred')
  .join('|')

const SAME_DAY_PATTERN = /\b(on that day|on the due date|same day)\b/i
const ISO_DATE_PATTERN = /\b(\d{4}-\d{2}-\d{2})\b/
const MONTH_DATE_PATTERN =
  /\b(?:on\s+)?((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?)\b/i
const OFFSET_PATTERN = new RegExp(
  `\\b((?:\\d+|(?:${SIMPLE_NUMBER_WORDS})(?:[-\\s](?:${SIMPLE_NUMBER_WORDS}))?))\\s+days?\\s+before\\b`,
  'i',
)
const EVERY_DAYS_PATTERN = /\bevery\s+(\d+)\s+days?\b/i

function clampDays(value) {
  const next = Math.trunc(Number(value) || 0)
  if (!Number.isFinite(next)) return null
  return Math.max(0, Math.min(next, 365))
}

function parseNumberToken(token) {
  if (!token) return null
  const normalized = String(token).trim().toLowerCase().replace(/-/g, ' ')
  if (!normalized) return null
  if (/^\d+$/.test(normalized)) return clampDays(normalized)
  if (normalized in NUMBER_WORDS) return clampDays(NUMBER_WORDS[normalized])

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (!parts.length || parts.length > 2) return null
  if (parts.length === 2 && parts[0] in NUMBER_WORDS && parts[1] in NUMBER_WORDS) {
    const value = Number(NUMBER_WORDS[parts[0]]) + Number(NUMBER_WORDS[parts[1]])
    return clampDays(value)
  }
  return null
}

function capitalizeFirst(text) {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function stripMatchedPattern(source, pattern) {
  return source.replace(pattern, ' ')
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRepeat(text) {
  const raw = String(text || '')
  const everyDaysMatch = raw.match(EVERY_DAYS_PATTERN)
  if (everyDaysMatch) {
    const intervalDays = clampDays(everyDaysMatch[1])
    if (intervalDays) return { type: 'custom', intervalDays }
  }

  if (/\b(daily|every day|each day)\b/i.test(raw)) return { type: 'daily', intervalDays: null }
  if (/\b(weekly|every week|each week)\b/i.test(raw)) return { type: 'weekly', intervalDays: null }
  if (/\b(monthly|every month|each month)\b/i.test(raw)) return { type: 'monthly', intervalDays: null }
  return null
}

function parseReminder(text, repeat) {
  const raw = String(text || '')
  if (SAME_DAY_PATTERN.test(raw)) {
    return {
      reminder: { includeOnDue: true },
      meta: { appliedDefaultReminder: false, explicitDueDayOnly: true },
    }
  }

  const offsetMatch = raw.match(OFFSET_PATTERN)
  if (offsetMatch) {
    const offsetDays = parseNumberToken(offsetMatch[1])
    if (offsetDays !== null) {
      return {
        reminder: {
          offsetDays,
          includeOnDue: true,
        },
        meta: { appliedDefaultReminder: false, explicitDueDayOnly: offsetDays === 0 },
      }
    }
  }

  if (repeat) {
    return {
      reminder: {
        offsetDays: 2,
        includeOnDue: true,
      },
      meta: { appliedDefaultReminder: true, explicitDueDayOnly: false },
    }
  }

  return { reminder: undefined, meta: { appliedDefaultReminder: false, explicitDueDayOnly: false } }
}

function parseDueDate(text, { now = new Date() } = {}) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const base = dayjs(now)

  const isoMatch = raw.match(ISO_DATE_PATTERN)
  if (isoMatch?.[1]) {
    const parsed = dayjs(isoMatch[1])
    return parsed.isValid() ? parsed.startOf('day').toDate() : null
  }

  const monthMatch = raw.match(MONTH_DATE_PATTERN)
  if (monthMatch?.[1]) {
    const parsed = dayjs(monthMatch[1])
    return parsed.isValid() ? parsed.startOf('day').toDate() : null
  }

  if (/\btomorrow\b/i.test(raw)) return base.add(1, 'day').startOf('day').toDate()
  if (/\btoday\b/i.test(raw)) return base.startOf('day').toDate()
  if (/\bnext week\b/i.test(raw)) return base.add(7, 'day').startOf('day').toDate()
  return null
}

function extractTitle(text) {
  let working = String(text || '')

  const patterns = [
    /\bremind me to\b/gi,
    /\bremind me\b/gi,
    /\bplease remind me to\b/gi,
    /\bplease remind me\b/gi,
    EVERY_DAYS_PATTERN,
    /\b(daily|every day|each day|weekly|every week|each week|monthly|every month|each month)\b/gi,
    OFFSET_PATTERN,
    SAME_DAY_PATTERN,
    /\b(today|tomorrow|next week)\b/gi,
    /\b(?:on\s+)?\d{4}-\d{2}-\d{2}\b/g,
    MONTH_DATE_PATTERN,
  ]

  patterns.forEach((pattern) => {
    working = stripMatchedPattern(working, pattern)
  })

  working = working
    .replace(/\b(to|that|please)\b/gi, ' ')
    .replace(/^[,\s.-]+|[,\s.-]+$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return capitalizeFirst(normalizeWhitespace(working))
}

function hasClearTitle(title, original) {
  const cleaned = normalizeWhitespace(title).toLowerCase()
  if (!cleaned) return false
  if (cleaned.length < 3) return false
  const normalizedOriginal = normalizeWhitespace(original).toLowerCase()
  if (cleaned === normalizedOriginal) return false
  if (/^(remind me|on that day|every \d+ days?|daily|weekly|monthly)$/i.test(cleaned)) return false
  return /[a-z0-9]/i.test(cleaned)
}

export function parseVoiceTaskIntent(transcript, options = {}) {
  const raw = normalizeWhitespace(transcript)
  if (!raw) {
    return {
      title: '',
      dueDate: null,
      confidence: 'low',
      meta: {
        hasClearTitle: false,
        appliedDefaultReminder: false,
        explicitDueDayOnly: false,
        usedAiFallback: false,
      },
    }
  }

  const repeat = parseRepeat(raw)
  const { reminder, meta: reminderMeta } = parseReminder(raw, repeat)
  const dueDate = parseDueDate(raw, options)
  const extractedTitle = extractTitle(raw)
  const clearTitle = hasClearTitle(extractedTitle, raw)

  const parsed = {
    title: clearTitle ? extractedTitle : capitalizeFirst(raw),
    dueDate,
    confidence: clearTitle || repeat || reminder ? 'high' : 'low',
    meta: {
      hasClearTitle: clearTitle,
      appliedDefaultReminder: reminderMeta.appliedDefaultReminder,
      explicitDueDayOnly: reminderMeta.explicitDueDayOnly,
      usedAiFallback: false,
    },
  }

  if (repeat) parsed.repeat = repeat
  if (reminder) parsed.reminder = reminder
  return parsed
}
