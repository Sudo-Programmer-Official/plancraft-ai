import { db } from "../firebaseAdmin.js"
import { sendEmail as sendEmailDirect } from "../emailService.js"

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildDefaultReminderHtml(text) {
  const body = escapeHtml(text).replace(/\n/g, "<br/>")
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;background:#f7f4ff;color:#24163d;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadfff;border-radius:20px;padding:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7b61c9;margin:0 0 14px;">PlanCraftAI reminder</div>
        <div style="font-size:15px;color:#24163d;">${body}</div>
        <hr style="border:none;border-top:1px solid #efe8ff;margin:18px 0"/>
        <p style="color:#7d6b9e;font-size:12px;margin:0;">Sent automatically by PlanCraftAI.</p>
      </div>
    </div>`
}

export async function sendEmail(userId, message, subject = "PlanCraftAI Reminder") {
  try {
    const snap = await db.collection("users").doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    const toEmail = data?.integrations?.email || data?.email

    if (!toEmail) {
      console.warn(`[Email] No email found for user ${userId}`)
      return { ok: false, error: "User email missing" }
    }

    const payload =
      message && typeof message === "object" && !Array.isArray(message)
        ? message
        : { text: String(message || ""), subject }
    const resolvedSubject = String(payload.subject || subject || "PlanCraftAI Reminder").trim() || "PlanCraftAI Reminder"
    const text = String(payload.text || payload.message || "")
    const html = payload.html ? String(payload.html) : buildDefaultReminderHtml(text)

    const result = await sendEmailDirect({
      to: String(toEmail).trim(),
      subject: resolvedSubject,
      html,
      text,
    })

    if (result?.skipped) {
      return { ok: false, skipped: true, error: result.reason }
    }
    if (result?.success) {
      console.log(`[Email] Sent to ${toEmail} (${result.status || 'ok'})`)
      return { ok: true, status: result.status || 202 }
    }
    console.error("[Email] Send failed:", result?.error)
    return { ok: false, error: result?.error || "Unknown error", status: result?.status || null }
  } catch (err) {
    console.error("[Email] Send failed:", err?.response?.body || err.message)
    return { ok: false, error: err?.message || "Unknown error" }
  }
}
