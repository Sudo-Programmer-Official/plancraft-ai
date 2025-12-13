import { db } from "../firebaseAdmin.js"
import { sendEmail as sendEmailDirect } from "../emailService.js"

export async function sendEmail(userId, message, subject = "PlanCraftAI Reminder") {
  try {
    const snap = await db.collection("users").doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    const toEmail = data?.integrations?.email || data?.email

    if (!toEmail) {
      console.warn(`[Email] No email found for user ${userId}`)
      return { ok: false, error: "User email missing" }
    }

    const html = `<div style="font-family:sans-serif;font-size:15px;">
               <p>${message}</p>
               <hr/>
               <p style="color:#999">💡 This reminder was sent automatically by PlanCraftAI.</p>
             </div>`

    const result = await sendEmailDirect({
      to: String(toEmail).trim(),
      subject,
      html,
      text: message,
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
