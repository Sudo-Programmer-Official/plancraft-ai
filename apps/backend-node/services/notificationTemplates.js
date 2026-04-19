import dayjs from '../utils/dayjs.js'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_TZ = 'UTC'
const DEFAULT_APP_URL = 'https://plancraftai.com'
const MAX_SUBJECT_LENGTH = 78
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

function baseAppUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.FRONTEND_URL ||
    process.env.VITE_APP_URL ||
    process.env.PUBLIC_URL ||
    DEFAULT_APP_URL
  ).replace(/\/+$/, '')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncateText(value, limit = MAX_SUBJECT_LENGTH) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.length <= limit) return raw
  return `${raw.slice(0, Math.max(limit - 1, 1)).trimEnd()}…`
}

function coerceUrl(candidate) {
  if (!candidate) return null
  if (typeof candidate === 'string') return candidate.trim() || null
  if (typeof candidate === 'object') {
    if (typeof candidate.url === 'string') return candidate.url.trim() || null
    if (typeof candidate.href === 'string') return candidate.href.trim() || null
    if (typeof candidate.link === 'string') return candidate.link.trim() || null
    if (typeof candidate.value === 'string') return candidate.value.trim() || null
    if (typeof candidate.uri === 'string') return candidate.uri.trim() || null
  }
  return null
}

function pickHashTag(count = 1) {
  if (count >= 3) return TAG_MOMENTUM
  return TAG_DAILY_FOCUS
}

function resolveReminderMoment(reminder, tz) {
  const raw = reminder?.scheduledTime || reminder?.remindAt || reminder?.time || null
  if (!raw) return null

  try {
    const parsed = dayjs(raw)
    if (!parsed.isValid()) return null
    return tz ? parsed.tz(tz) : parsed
  } catch {
    return null
  }
}

function formatReminderClock(reminder, tz) {
  if (reminder?.reminderTime) return reminder.reminderTime
  const parsed = resolveReminderMoment(reminder, tz)
  return parsed?.isValid?.() ? parsed.format('h:mm A') : null
}

function formatReminderDateTime(reminder, tz) {
  const parsed = resolveReminderMoment(reminder, tz)
  if (parsed?.isValid?.()) return parsed.format('ddd, MMM D • h:mm A')
  return formatReminderClock(reminder, tz)
}

function formatReminderLine(reminder, tz) {
  if (!reminder || typeof reminder !== 'object') return 'Focus session'
  const title = reminder.title || reminder.text || reminder.message || 'Focus session'
  const timeLabel = formatReminderClock(reminder, tz)
  if (!timeLabel) return title
  return `${title} • ${timeLabel}`
}

function resolveReminderLink(reminder) {
  const ctx = reminder?.context && typeof reminder.context === 'object' ? reminder.context : {}

  const candidates = [
    { url: coerceUrl(reminder?.meetingLink), label: 'Join meeting' },
    { url: coerceUrl(ctx?.meetingLink), label: 'Join meeting' },
    { url: coerceUrl(reminder?.joinUrl), label: 'Join meeting' },
    { url: coerceUrl(ctx?.joinUrl), label: 'Join meeting' },
    { url: coerceUrl(reminder?.link), label: 'Open link' },
    { url: coerceUrl(ctx?.link), label: 'Open link' },
    { url: coerceUrl(reminder?.eventLink), label: 'Open event' },
    { url: coerceUrl(ctx?.eventLink), label: 'Open event' },
    { url: coerceUrl(reminder?.calendarLink), label: 'Open calendar event' },
    { url: coerceUrl(ctx?.calendarLink), label: 'Open calendar event' },
    { url: coerceUrl(reminder?.htmlLink), label: 'Open calendar event' },
    { url: coerceUrl(ctx?.htmlLink), label: 'Open calendar event' },
  ].find((candidate) => !!candidate.url)

  return candidates || null
}

function buildPlannerUrl(reminder, tz) {
  const url = new URL(`${baseAppUrl()}/planner`)
  const parsed = resolveReminderMoment(reminder, tz)

  url.searchParams.set('mode', 'reminderOnly')
  if (parsed?.isValid?.()) {
    url.searchParams.set('date', parsed.format('YYYY-MM-DD'))
    url.searchParams.set('reminderTime', parsed.format('HH:mm'))
  }
  if (reminder?.id) url.searchParams.set('reminderId', String(reminder.id))
  return url.toString()
}

function resolveEmailActions(reminders, explicitCtaUrl, tz) {
  const primaryReminder = Array.isArray(reminders) && reminders.length ? reminders[0] : null
  const reminderLink = resolveReminderLink(primaryReminder)
  const plannerUrl = buildPlannerUrl(primaryReminder, tz)
  const primaryUrl = coerceUrl(explicitCtaUrl) || reminderLink?.url || plannerUrl
  const primaryLabel = coerceUrl(explicitCtaUrl)
    ? 'Open reminder'
    : reminderLink?.label || 'Open planner'

  const secondary =
    primaryUrl && primaryUrl !== plannerUrl
      ? { label: 'Open planner', url: plannerUrl }
      : null

  return {
    primary: primaryUrl ? { label: primaryLabel, url: primaryUrl } : null,
    secondary,
    plannerUrl,
  }
}

function buildEmailSubject(reminders, tz) {
  const primaryReminder = Array.isArray(reminders) && reminders.length ? reminders[0] : null
  const primaryTitle = primaryReminder?.title || primaryReminder?.text || primaryReminder?.message || 'Your next task'
  const timeLabel = formatReminderClock(primaryReminder, tz)

  if ((reminders || []).length > 1) {
    return truncateText(`${reminders.length} reminders ready in PlanCraftAI`)
  }
  if (timeLabel) {
    return truncateText(`Reminder ${timeLabel}: ${primaryTitle}`)
  }
  return truncateText(`Reminder: ${primaryTitle}`)
}

function buildEmailText({ safeFirstName, segment, reminders, actions, tz }) {
  const count = Array.isArray(reminders) ? reminders.length : 0
  const intro =
    count > 1
      ? `You have ${count} reminders lined up.`
      : 'Your next reminder is ready.'

  const sections = [
    `Good ${segment.label}, ${safeFirstName}`,
    '',
    intro,
    '',
  ]

  reminders.slice(0, 4).forEach((reminder, index) => {
    const title = reminder?.title || reminder?.text || reminder?.message || 'Focus session'
    const when = formatReminderDateTime(reminder, tz)
    const where = reminder?.context?.location || reminder?.location || null

    sections.push(index === 0 ? 'Next up' : 'Also on deck')
    sections.push(title)
    if (when) sections.push(`When: ${when}`)
    if (where) sections.push(`Where: ${where}`)
    sections.push('')
  })

  if (count > 4) {
    sections.push(`Plus ${count - 4} more reminder${count - 4 === 1 ? '' : 's'} in your planner.`)
    sections.push('')
  }

  if (actions.primary?.url) sections.push(`${actions.primary.label}: ${actions.primary.url}`)
  if (actions.secondary?.url) sections.push(`${actions.secondary.label}: ${actions.secondary.url}`)

  sections.push('')
  sections.push('Sent automatically by PlanCraftAI.')

  return sections.join('\n')
}

function buildReminderRowsHtml(reminders, tz) {
  return reminders
    .slice(1, 4)
    .map((reminder) => {
      const title = escapeHtml(reminder?.title || reminder?.text || reminder?.message || 'Focus session')
      const when = escapeHtml(formatReminderDateTime(reminder, tz) || 'Soon')

      return `
        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f4ff;border:1px solid #eadfff;border-radius:16px;">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-size:16px;line-height:1.5;font-weight:700;color:#23163d;margin:0 0 6px 0;">${title}</div>
                  <div style="font-size:13px;line-height:1.5;color:#6b5a8c;">${when}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    })
    .join('')
}

function buildEmailHtml({ safeFirstName, segment, reminders, actions, tz }) {
  const primaryReminder = Array.isArray(reminders) && reminders.length ? reminders[0] : null
  const count = Array.isArray(reminders) ? reminders.length : 0
  const primaryTitle = escapeHtml(
    primaryReminder?.title || primaryReminder?.text || primaryReminder?.message || 'Focus session'
  )
  const primaryWhen = escapeHtml(formatReminderDateTime(primaryReminder, tz) || 'Soon')
  const primaryWhere = escapeHtml(primaryReminder?.context?.location || primaryReminder?.location || '')
  const preheader = escapeHtml(
    count > 1
      ? `${count} reminders are ready in PlanCraftAI.`
      : `${primaryReminder?.title || 'Your reminder'}${formatReminderClock(primaryReminder, tz) ? ` at ${formatReminderClock(primaryReminder, tz)}` : ''}`
  )
  const intro =
    count > 1
      ? `You have ${count} reminders lined up. Start with the next one below and adjust the rest in Planner.`
      : 'Your next reminder is ready. Open it, handle it, and keep the day moving.'
  const extraCount = count > 4 ? count - 4 : 0
  const extraRows = buildReminderRowsHtml(reminders, tz)

  const primaryButton = actions.primary?.url
    ? `<a href="${escapeHtml(actions.primary.url)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#5b3df5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(actions.primary.label)}</a>`
    : ''
  const secondaryButton = actions.secondary?.url
    ? `<a href="${escapeHtml(actions.secondary.url)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#ede9fe;color:#33205a;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(actions.secondary.label)}</a>`
    : ''
  const buttonSpacer = primaryButton && secondaryButton ? '&nbsp;&nbsp;' : ''

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>PlanCraftAI reminder</title>
      </head>
      <body bgcolor="#f4f0ff" style="margin:0;padding:0;background:#f4f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#23163d;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f0ff" style="border-collapse:collapse;background:#f4f0ff;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-collapse:collapse;max-width:640px;background:#ffffff;border:1px solid #e9ddff;border-radius:28px;overflow:hidden;">
                <tr>
                  <td bgcolor="#2b1759" style="padding:28px 28px 18px;background:#2b1759;background-image:linear-gradient(135deg,#2b1759 0%,#4f2eb8 58%,#7c4dff 100%);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;">
                      <tr>
                        <td bgcolor="#f7f3ff" style="padding:18px 18px 20px;background:#f7f3ff !important;border:1px solid #d9cbff;border-radius:22px;">
                          <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#ebe3ff !important;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#4f2eb8 !important;">PlanCraftAI reminder</div>
                          <h1 style="margin:18px 0 8px;font-size:30px;line-height:1.2;font-weight:800;color:#1f1537 !important;">Good ${escapeHtml(segment.label)}, ${escapeHtml(safeFirstName)}</h1>
                          <p style="margin:0;font-size:16px;line-height:1.7;color:#4b3d68 !important;">${escapeHtml(intro)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 24px 8px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8f6ff;border:1px solid #eadfff;border-radius:24px;">
                      <tr>
                        <td style="padding:24px 22px;">
                          <div style="font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7b61c9;margin:0 0 12px 0;">Next up</div>
                          <div style="font-size:29px;line-height:1.28;font-weight:800;color:#23163d;margin:0 0 18px 0;">${primaryTitle}</div>
                          <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                            <tr>
                              <td style="padding:0 10px 10px 0;">
                                <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#ebe5ff;font-size:13px;line-height:1.3;font-weight:700;color:#4e32a8;">${primaryWhen}</div>
                              </td>
                              ${primaryWhere ? `<td style="padding:0 0 10px 0;"><div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#efeaff;font-size:13px;line-height:1.3;font-weight:600;color:#5b4a82;">${primaryWhere}</div></td>` : ''}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${(count > 1 && extraRows)
                  ? `<tr>
                      <td style="padding:8px 24px 0;">
                        <div style="font-size:13px;line-height:1.4;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7b61c9;margin:0 0 12px 4px;">Also on deck</div>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                          ${extraRows}
                        </table>
                      </td>
                    </tr>`
                  : ''}
                ${extraCount > 0
                  ? `<tr><td style="padding:0 28px 8px;font-size:14px;line-height:1.6;color:#65557e;">Plus ${extraCount} more reminder${extraCount === 1 ? '' : 's'} waiting in Planner.</td></tr>`
                  : ''}
                <tr>
                  <td style="padding:18px 28px 4px;">
                    ${primaryButton}${buttonSpacer}${secondaryButton}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 28px 28px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#65557e;">Clear, calm, and ready when you are. PlanCraftAI keeps the next move visible so your day stays lighter.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 24px;border-top:1px solid #efe8ff;background:#fbfaff;">
                    <p style="margin:0;font-size:12px;line-height:1.7;color:#7c6b9e;">Sent automatically by PlanCraftAI. If the button doesn’t open, copy this link into your browser:</p>
                    <p style="margin:8px 0 0;font-size:12px;line-height:1.7;color:#5b3df5;word-break:break-word;">${escapeHtml(actions.primary?.url || actions.secondary?.url || buildPlannerUrl(primaryReminder, tz))}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`
}

export function buildReminderBrandCopy({ name, reminders = [], timezone, ctaUrl } = {}) {
  const list = Array.isArray(reminders) ? reminders.filter(Boolean) : []
  const tz = timezone || list[0]?.timezone || DEFAULT_TZ
  const segment = resolveDaySegment(tz)
  const focusCount = list.length
  const safeFirstName = safeName(name)

  const primaryReminder = list.length ? list[0] : null
  const primaryTitle = primaryReminder?.title || primaryReminder?.text || null

  const highlight =
    focusCount > 1
      ? `You’ve got ${focusCount} focus tasks ahead.`
      : primaryTitle
        ? `Your next focus: ${primaryTitle}.`
        : 'Your next focus block is waiting.'

  const tag = pickHashTag(focusCount)
  const actions = resolveEmailActions(list, ctaUrl, tz)
  const ctaLine = actions.primary?.url
    ? `${actions.primary.label}: ${actions.primary.url}`
    : 'Open your planner to review.'

  const whatsappLines = [
    `${segment.emoji} Good ${segment.label}, ${safeFirstName}!`,
    `Ready to win the day? ${highlight}`,
    ctaLine,
  ]
  const whatsapp = `${whatsappLines.join('\n')}\n${tag}`

  const smsCore = `${segment.emoji} ${safeFirstName}, ${highlight}`
  const sms = actions.primary?.url ? `${smsCore} ${actions.primary.url} ${tag}`.trim() : `${smsCore} ${tag}`.trim()
  const voiceMessage = `${safeFirstName}, ${highlight.replace(/\s+/g, ' ')} Open your planner to review.`

  const emailText = buildEmailText({
    safeFirstName,
    segment,
    reminders: list,
    actions,
    tz,
  })
  const emailHtml = buildEmailHtml({
    safeFirstName,
    segment,
    reminders: list,
    actions,
    tz,
  })

  return {
    tag,
    headline:
      focusCount > 1
        ? `${focusCount} reminders ready`
        : 'Your next reminder is ready',
    subject: buildEmailSubject(list, tz),
    whatsapp,
    email: emailText,
    emailText,
    emailHtml,
    sms,
    voiceMessage,
  }
}
