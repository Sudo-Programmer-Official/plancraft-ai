import sgMail from '@sendgrid/mail'

let initialized = false

function ensureClient() {
  const key = process.env.SENDGRID_API_KEY
  if (!key) return null
  if (!initialized) {
    try {
      sgMail.setApiKey(key)
      initialized = true
      console.log('[email] SendGrid initialized')
    } catch (err) {
      console.error('[email] Failed to set API key:', err?.message || err)
    }
  }
  return key
}

export function initEmail() {
  return ensureClient()
}

export async function sendEmail({ to, subject, html, text, from }) {
  try {
    const key = ensureClient()
    const sender = from || process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL
    if (!key) {
      console.log('[email] SENDGRID_API_KEY not set; skipping send to', to)
      return { skipped: true, reason: 'no_api_key' }
    }
    if (!sender) {
      console.log(
        '[email] EMAIL_FROM not set; skipping send to',
        to,
        '(set a verified SendGrid sender or domain)',
      )
      return { skipped: true, reason: 'no_from' }
    }
    if (!to) return { success: false, error: 'missing_to' }

    const msg = {
      to,
      from: sender,
      subject: subject || 'PlanCraftAI Update',
      html: html || '',
      text: text || undefined,
    }
    const [response] = await sgMail.send(msg)
    const status = response?.statusCode
    console.info('[email] sent', { to, status })
    return { success: true, status, response: response || null }
  } catch (e) {
    const status = e?.code || e?.response?.statusCode
    const details = e?.response?.body?.errors?.map((x) => x?.message).join('; ')
    const msg = e?.message || details || String(e)
    const hint =
      status === 403
        ? 'Hint: Verify your SendGrid sender identity or domain and set EMAIL_FROM to that verified address.'
        : ''
    console.warn(`sendEmail skipped/failed (status ${status || 'n/a'}): ${msg} ${hint}`)
    return { success: false, status, error: msg }
  }
}

// Personalized Report Email (themed)
export async function sendReportEmail(to, htmlUrl, pdfUrl, metrics = {}) {
  const period = metrics.period || 'weekly'
  const name = metrics.name || 'there'
  const completed = metrics.completed ?? 'N/A'
  const avgTime = metrics.avgTime || 'N/A'
  const topMood = metrics.topMood || 'N/A'
  const carryover = metrics.carryover ?? '—'

  const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
        <h2 style="margin:0 0 8px">Hey ${name} 💜</h2>
        <p style="margin:0 0 12px">Here’s your ${period} summary:</p>
        <ul style="line-height:1.7;margin:0 0 12px">
          <li>✅ Tasks completed: <b>${completed}</b></li>
          <li>🕐 Avg. completion time: <b>${avgTime}</b></li>
          <li>🌿 Mood trend: <b>${topMood}</b></li>
          <li>🔁 Carryover rate: <b>${carryover}</b></li>
        </ul>
        <p style="margin:12px 0">
          <a href="${htmlUrl}" style="color:#6366f1;text-decoration:none">📊 View report online</a>
        </p>
        ${pdfUrl ? `<p style=\"margin:8px 0\"><a href=\"${pdfUrl}\" style=\"color:#22c55e;text-decoration:none\">📄 Download PDF</a></p>` : ''}
        <hr style="border-color:#1f2937;border-width:0;border-top:1px solid #1f2937;margin:16px 0"/>
        <p style="font-size:12px;color:#94a3b8;margin:0">Made with 💜 by PlanCraftAI</p>
      </div>
    `

  return sendEmail({
    to,
    subject: `Your ${period} PlanCraftAI Report 📊`,
    html,
    text: `Your ${period} PlanCraftAI report is ready. View it here: ${htmlUrl}${pdfUrl ? ` or download the PDF: ${pdfUrl}` : ''}`,
  })
}
