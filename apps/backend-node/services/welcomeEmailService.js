import { db } from './firebaseAdmin.js'
import { sendEmail } from './emailService.js'

function buildWelcomeEmail({ name = '' } = {}) {
  const firstName = String(name || '').trim().split(/\s+/)[0] || 'there'
  const subject = 'Welcome to PlanCraftAI'
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b1022;color:#e5e7eb;padding:24px">
      <h2 style="margin:0 0 12px">Welcome, ${firstName}</h2>
      <p style="margin:0 0 12px">You are in. PlanCraftAI helps you turn raw notes into clear action.</p>
      <ul style="line-height:1.7;margin:0 0 12px;padding-left:18px">
        <li>Capture ideas quickly in <b>Capture</b></li>
        <li>Commit only what matters in <b>Inbox</b></li>
        <li>Run your day from <b>Today</b></li>
      </ul>
      <p style="margin:0 0 12px">Pro tip: add our number to your contacts as <b>PlanCraftAI</b> so reminders and calls are easy to recognize.</p>
      <p style="margin:0;color:#94a3b8;font-size:12px">Made with care by PlanCraftAI</p>
    </div>
  `
  const text = `Welcome to PlanCraftAI.

Start here:
- Capture raw ideas quickly
- Confirm what matters in Inbox
- Focus execution from Today

Pro tip: save our number as PlanCraftAI so reminders are easy to recognize.`
  return { subject, html, text }
}

export async function sendWelcomeEmailIfNeeded(uid, profile = {}) {
  if (!uid) return { sent: false, reason: 'missing_uid' }
  const email = String(profile?.email || '').trim()
  if (!email) return { sent: false, reason: 'missing_email' }
  if (profile?.isGuest === true || profile?.mode === 'guest') return { sent: false, reason: 'guest' }

  const onboarding = profile?.preferences?.onboarding || {}
  if (onboarding?.welcomeEmailSentAt) {
    return { sent: false, reason: 'already_sent' }
  }

  const { subject, html, text } = buildWelcomeEmail({ name: profile?.name || profile?.displayName })
  const result = await sendEmail({
    to: email,
    subject,
    html,
    text,
    tags: ['onboarding', 'welcome'],
    metadata: { uid: String(uid), type: 'welcome_email' },
  })

  if (!result?.success) {
    return { sent: false, reason: 'send_failed', error: result?.error || 'send_failed' }
  }

  const nowIso = new Date().toISOString()
  await db.collection('users').doc(String(uid)).set(
    {
      preferences: {
        onboarding: {
          welcomeEmailSentAt: nowIso,
        },
      },
    },
    { merge: true },
  )

  return { sent: true, sentAt: nowIso }
}
