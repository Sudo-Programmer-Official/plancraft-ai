import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_TZ = 'UTC'
const TAG_DAILY_FOCUS = '#DailyFocus'
const TAG_MOMENTUM = '#MomentumDay'
const TAG_PLANNER_MODE = '#PlannerMode'

function safeName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return 'planner friend'
  const [first] = trimmed.split(/\s+/)
  return first || trimmed
}

function resolveDaySegment(tz) {
  try {
    const now = tz ? dayjs().tz(tz) : dayjs()
    const hour = now.hour()
    if (hour < 5) return { label: 'early morning', emoji: '🌅' }
    if (hour < 12) return { label: 'morning', emoji: '🌞' }
    if (hour < 17) return { label: 'afternoon', emoji: '☀️' }
    if (hour < 21) return { label: 'evening', emoji: '🌙' }
    return { label: 'night', emoji: '🌙' }
  } catch {
    return { label: 'day', emoji: '✨' }
  }
}

function formatReminderLine(reminder, tz) {
  if (!reminder || typeof reminder !== 'object') return 'Focus session'
  const title = reminder.title || reminder.text || reminder.message || 'Focus session'
  const resolvedTz = reminder.timezone || tz || DEFAULT_TZ

  let timeLabel = null
  if (reminder.reminderTime) {
    timeLabel = reminder.reminderTime
  } else if (reminder.scheduledTime) {
    try {
      const m = dayjs(reminder.scheduledTime).isValid()
        ? dayjs(reminder.scheduledTime).tz(resolvedTz)
        : dayjs(reminder.scheduledTime)
      if (m.isValid()) timeLabel = m.format('h:mm A')
    } catch {}
  }

  if (!timeLabel) return title
  return `${title} • ${timeLabel}`
}

function pickHashTag(count = 1) {
  if (count >= 3) return TAG_MOMENTUM
  return TAG_DAILY_FOCUS
}

export function buildReminderBrandCopy({ name, reminders = [], timezone, ctaUrl } = {}) {
  const tz = timezone || reminders[0]?.timezone || DEFAULT_TZ
  const segment = resolveDaySegment(tz)
  const focusCount = Array.isArray(reminders) ? reminders.length : 0
  const safeFirstName = safeName(name)

  const primaryReminder = reminders && reminders.length ? reminders[0] : null
  const primaryTitle = primaryReminder?.title || primaryReminder?.text || null

  const highlight =
    focusCount > 1
      ? `You’ve got ${focusCount} focus tasks ahead.`
      : primaryTitle
      ? `Your next focus: ${primaryTitle}.`
      : 'Your next focus block is waiting.'

  const tag = pickHashTag(focusCount)
  const ctaLine = ctaUrl ? `Tap to review 👉 ${ctaUrl}` : 'Tap to review 👉'

  const whatsappLines = [
    `${segment.emoji} Good ${segment.label}, ${safeFirstName}!`,
    `Ready to win the day? ${highlight}`,
    ctaLine,
  ]
  const whatsapp = `${whatsappLines.join('\n')}\n${tag}`

  const listLines = (Array.isArray(reminders) ? reminders : [])
    .slice(0, 4)
    .map((item) => `• ${formatReminderLine(item, tz)}`)
  const listBlock = listLines.length ? listLines.join('\n') : '• Quick momentum check-in with your planner.'

  const emailSections = [
    `${segment.emoji} Good ${segment.label}, ${safeFirstName}!`,
    '',
    `Here’s what’s on deck:`,
    listBlock,
    '',
    ctaUrl ? `${ctaLine}` : `${ctaLine} (open the planner to jump in)`,
    '',
    `${tag} | ${TAG_PLANNER_MODE}`,
  ]
  const email = emailSections.join('\n')

  const smsCore = `${segment.emoji} ${safeFirstName}, ${highlight}`
  const sms = ctaUrl ? `${smsCore} ${ctaUrl} ${tag}`.trim() : `${smsCore} ${tag}`.trim()

  const voiceMessage = `${safeFirstName}, ${highlight.replace(/\s+/g, ' ')} Open your planner to review.`

  return {
    tag,
    headline: `${segment.emoji} ${segment.label
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')} Focus`,
    subject: `${segment.emoji} ${tag.replace('#', '')}`,
    whatsapp,
    email,
    sms,
    voiceMessage,
  }
}
