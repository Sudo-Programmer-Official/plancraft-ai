import sgMail from '@sendgrid/mail'

export function initEmail() {
  const key = process.env.SENDGRID_API_KEY
  if (key) sgMail.setApiKey(key)
}

export async function sendEmail({ to, subject, html, from }) {
  try {
    const key = process.env.SENDGRID_API_KEY
    const sender = from || process.env.EMAIL_FROM
    if (!key) {
      console.log('[email] SENDGRID_API_KEY not set; skipping send to', to)
      return { skipped: true, reason: 'no_api_key' }
    }
    if (!sender) {
      console.log('[email] EMAIL_FROM not set; skipping send to', to, '(set a verified SendGrid sender or domain)')
      return { skipped: true, reason: 'no_from' }
    }
    const msg = { to, from: sender, subject: subject || 'PlanCraftAI Report', html: html || '' }
    await sgMail.send(msg)
    return { success: true }
  } catch (e) {
    const status = e?.code || e?.response?.statusCode
    const details = e?.response?.body?.errors?.map((x) => x?.message).join('; ')
    const msg = e?.message || details || String(e)
    const hint = status === 403 ? 'Hint: Verify your SendGrid sender identity or domain and set EMAIL_FROM to that verified address.' : ''
    console.warn(`sendEmail skipped/failed (status ${status || 'n/a'}): ${msg} ${hint}`)
    return { success: false, status, error: msg }
  }
}

// Personalized Report Email (themed)
export async function sendReportEmail(to, htmlUrl, pdfUrl, metrics = {}) {
  try {
    const key = process.env.SENDGRID_API_KEY
    const sender = process.env.EMAIL_FROM
    if (!key) {
      console.log('[email] SENDGRID_API_KEY not set; skipping sendReportEmail to', to)
      return { skipped: true, reason: 'no_api_key' }
    }
    if (!sender) {
      console.log('[email] EMAIL_FROM not set; skipping sendReportEmail to', to, '(set a verified SendGrid sender or domain)')
      return { skipped: true, reason: 'no_from' }
    }
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
    await sgMail.send({ to, from: sender, subject: `Your ${period} PlanCraftAI Report 📊`, html })
    return { success: true }
  } catch (e) {
    const status = e?.code || e?.response?.statusCode
    const details = e?.response?.body?.errors?.map((x) => x?.message).join('; ')
    const msg = e?.message || details || String(e)
    const hint = status === 403 ? 'Hint: Verify your SendGrid sender identity or domain and set EMAIL_FROM to that verified address.' : ''
    console.warn(`sendReportEmail skipped/failed (status ${status || 'n/a'}): ${msg} ${hint}`)
    return { success: false, status, error: msg }
  }
}
