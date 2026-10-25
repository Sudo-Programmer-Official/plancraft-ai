import { sendEmail } from './emailService.js'

const DEFAULT_SUPPORT_EMAIL = 'help@sudoprogrammer.com'
const MAX_VALUE_LENGTH = 600

function textValue(value, fallback = '—') {
  const normalized = String(value ?? '').trim()
  if (!normalized) return fallback
  return normalized.slice(0, MAX_VALUE_LENGTH)
}

function escapeHtml(value) {
  return textValue(value, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatAmount(amount, currency) {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return '—'
  const code = String(currency || '').trim().toUpperCase()
  return `${(numeric / 100).toFixed(2)} ${code || 'currency units'}`
}

function supportEmailAddress() {
  return String(
    process.env.STRIPE_SUPPORT_EMAIL || process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL,
  ).trim() || DEFAULT_SUPPORT_EMAIL
}

/**
 * Sends a best-effort internal billing notification.
 * Stripe checkout and webhook processing must continue if email is unavailable.
 */
export async function notifyStripeSupport({
  outcome = 'error',
  eventType = 'stripe_event',
  eventId = null,
  userId = null,
  userEmail = null,
  workspaceId = null,
  plan = null,
  foundingOffer = null,
  sessionId = null,
  invoiceId = null,
  customerId = null,
  amount = null,
  currency = null,
  error = null,
} = {}) {
  const normalizedOutcome = ['success', 'error', 'warning'].includes(String(outcome))
    ? String(outcome)
    : 'error'
  const outcomeLabel = normalizedOutcome === 'success'
    ? 'Payment succeeded'
    : normalizedOutcome === 'warning'
      ? 'Billing warning'
      : 'Stripe error'
  const subject = `[PlanCraftAI Stripe] ${outcomeLabel} · ${textValue(eventType, 'event')}`
  const details = [
    ['Event', eventType],
    ['Event ID', eventId],
    ['User ID', userId],
    ['User email', userEmail],
    ['Workspace ID', workspaceId],
    ['Plan', plan],
    ['Founding offer', foundingOffer == null ? null : foundingOffer ? 'yes' : 'no'],
    ['Checkout session', sessionId],
    ['Invoice', invoiceId],
    ['Stripe customer', customerId],
    ['Amount', formatAmount(amount, currency)],
    ['Error', error],
  ].filter(([, value]) => value != null && String(value).trim() !== '')

  const text = [
    `${outcomeLabel}: ${eventType}`,
    '',
    ...details.map(([label, value]) => `${label}: ${textValue(value)}`),
  ].join('\n')
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#172033;line-height:1.55">
      <h2 style="margin:0 0 16px">${escapeHtml(outcomeLabel)}</h2>
      <p style="margin:0 0 16px"><b>${escapeHtml(eventType)}</b></p>
      <table style="border-collapse:collapse;width:100%;max-width:680px">
        ${details.map(([label, value]) => `<tr><td style="padding:7px 12px 7px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0;word-break:break-word">${escapeHtml(value)}</td></tr>`).join('')}
      </table>
    </div>
  `

  try {
    const result = await sendEmail({
      to: supportEmailAddress(),
      subject,
      html,
      text,
      tags: ['stripe', 'billing', normalizedOutcome],
      metadata: {
        eventType: textValue(eventType),
        eventId: textValue(eventId, ''),
        outcome: normalizedOutcome,
      },
    })
    if (!result?.success && !result?.skipped) {
      console.warn('[Stripe] support notification failed', result?.error || result)
    }
    return result
  } catch (notificationError) {
    console.warn('[Stripe] support notification threw', notificationError?.message || notificationError)
    return { success: false, error: notificationError?.message || 'support_notification_failed' }
  }
}
